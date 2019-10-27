/**
 * This file is of central importance to this stack.  It visits a URL
 * (or a series of URLs) and retrieves data (including screenshots) either
 * from the URL itself or a representation of the URL in the Internet
 * Archive's wayback machine.
 */

require("dotenv").config();
const request = require("superagent");
const fs = require("fs");
const moment = require("moment");
const csvParse = require("csv-parse/lib/sync");
const puppeteer = require("puppeteer");
const args = require("minimist")(process.argv.slice(2));
const datastore = require("nedb-promise");
const geoip = require("geoip-lite");
const packageJson = require("../package.json");
const imageSize = require("image-size");
const cheerio = require("cheerio");
const slugify = require("slugify");
const setupLogger = require("./utils.js").setupLogger;

// config
const screenshotsDir = "data/collected/screenshots";
const waybackDateFormat = "YYYYMMDDHHmmss";
const overwrite = args.overwrite == "true" ? true : false;
const timeout = 60000;

// setup database tables
const colleges_db = datastore({
  filename: "data/collected/colleges.db",
  autoload: true
});
const libraries_db = datastore({
  filename: "data/collected/libraries.db",
  autoload: true
});
const pages_db = datastore({
  filename: "data/collected/pages.db",
  autoload: true
});
const visits_db = datastore({
  filename: "data/collected/visits.db",
  autoload: true
});
const builtwith_db = datastore({
  filename: "data/collected/builtwith.db",
  autoload: true
});

// specific error handling
class NotInWaybackError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotInWaybackError";
  }
}

// setup logger
const logger = setupLogger("visit");
const timeouts = setupLogger("timeouts");

// puppeteer viewports, for screenshots
const viewports = [
  {
    name: "mobile",
    width: 600,
    height: 1,
    isLandscape: false
  },
  {
    name: "desktop",
    width: 1200,
    height: 1,
    isLandscape: true
  }
];

/**
 * Main process.
 */
(async () => {
  // setup
  const browser = await puppeteer.launch({
    // headless: false,
    args: ["--disable-web-security", "--allow-running-insecure-content"]
  });
  try {
    // global ip address
    const response = await request.get("ipv4bot.whatismyipaddress.com");
    const ip = response.text;

    // fist, get live URL (no wayback) if available
    //TODO; not yet working.  Needs broader idea of current to not waste API resources
    // if (page.visit && args.current) {
    //   const currentyear_regex = new RegExp(`^${moment.utc().format("YYYY")}`);
    //   const found = await visits_db.find({ accessed: { $regex: /^2019/ } });
    //   // await getVisit(moment.utc(), page.url, browser, ip, false);
    // }

    if (args.file) {
      // console.log(args.file)

      // get pages from input file
      const pages = await JSON.parse(fs.readFileSync(args.file));
      for (const page of pages) {
        await getWayback(moment.utc(page.date), page.url, browser, ip);
      }

    } else {
      // loop through pages from Google Doc
      const pages = args.url
        ? [{ url: args.url, visit: true }]
        : await pages_db.find({});

      for (const page of pages) {
        const startDate = args.startDate
          ? moment.utc(args.startDate)
          : page.start_date
          ? moment.utc(page.start_date)
          : moment.utc("1995-01-01");
        const endDate = args.endDate
          ? moment.utc(args.endDate)
          : page.end_date
          ? moment.utc(page.end_date)
          : moment.utc();

        // go into the Wayback Machine for historical data
        let date = startDate;
        const increment = args.increment ? args.increment : "100 years";
        while (date.isBefore(endDate)) {
          // manually skip certain dates
          const skips = page.skip
            ? page.skip.split(",").map(i => i.trim())
            : [];

          // visit or skip, depending
          if (page.visit && !skips.includes(date.format("YYYY-MM-DD"))) {
            await getWayback(date, page.url, browser, ip);
          } else if (page.visit && page.skip) {
            logger.warn(`--: ${page.url} ${date.format("YYYY-MM-DD")} (skip)`);
          }

          // increment
          date = date.add(increment.split(" ")[0], increment.split(" ")[1]);
        }
      }
    }
  } catch (err) {
    logger.error(err);
  } finally {
    // cleanup
    await browser.close();
  }
})();

async function getWayback(date, url, browser, ip) {
  try {

    // console.log(date.format(), url)

    const availDate = await getWaybackDate(date, url);
    if (availDate) {
      await getVisit(availDate, url, browser, ip, true);
    } else {
      throw new NotInWaybackError();
    }
  } catch (err) {
    if (["NotInWaybackError"].includes(err.name)) {
      logger.error(`!!: ${url} ${date.format("YYYY-MM-DD")} (${err.name})`);
    } else {
      throw err;
    }
  }
}

async function getVisit(date, url, browser, ip, wayback = true) {
  const renderedURL = wayback ? waybackUrl(date, url, false) : url;
  const rawURL = wayback ? waybackUrl(date, url, true) : url;

  try {
    // setup puppeteer
    const page = await browser.newPage();

    // determine if data exists in database
    const inDatabase =
      (await visits_db.count({ date: date.format("YYYY-MM-DD"), url })) > 0;

    if (overwrite || !inDatabase) {
      // metadata
      let metadata = {
        url,
        slug: slugifyUrl(url),
        date: date.format("YYYY-MM-DD"),
        library: await getLibraryData(url),
        client: {
          ip,
          geo: geoip.lookup(ip)
        },

        // raw HTML from Superagent
        raw: await getRaw(rawURL),

        // data from Puppeteer
        rendered: await getRendered(renderedURL, page),

        // data from builtwith
        builtwith: await getBuiltWith(rawURL)
      };

      // browser data
      metadata.rendered.browser = {
        userAgent: await browser.userAgent(),
        version: await browser.version()
      };

      // screenshots
      metadata.rendered.screenshots = [];
      for (const viewport of viewports) {
        metadata.rendered.screenshots.push(
          await takeScreenshot(date, url, page, viewport)
        );
      }

      // write db
      await visits_db.update(
        { date: date.format("YYYY-MM-DD"), url },
        metadata,
        {
          upsert: true
        }
      );

      // report
      if (overwrite && inDatabase) {
        logger.info(`OK: ${url} ${date.format("YYYY-MM-DD")} (overwritten)`);
      } else {
        logger.info(`OK: ${url} ${date.format("YYYY-MM-DD")} (created)`);
      }
    } else {
      logger.warn(`--: ${url} ${date.format("YYYY-MM-DD")} (exists)`);
    }

    // clean up
    await page.close();
  } catch (err) {
    if (["TimeoutError"].includes(err.name)) {
      const msg = `!!: ${url} ${date.format("YYYY-MM-DD")} (${
        err.name
      } ${timeout}ms)`;
      logger.error(msg);
    } else {
      logger.error(
        `!!: ${url} ${date.format("YYYY-MM-DD")} (${err.name}), "${
          err.message
        }"`
      );
    }
  }
}

async function getRendered(url, page) {
  // puppeteer navigate to page
  await page.goto(url, {
    waitUntil: "networkidle0",
    timeout
  });

  // for debugging within evaluate steps
  page.on("console", msg => {
    if (msg._type === "error") {
      if (msg._text.match(/404/)) {
        logger.warn(` !: ${url} internal error: 404`);
      } else if (msg._text.match(/Refused to load/)) {
        logger.warn(` !: ${url} internal error: CORS`);
      } else {
        logger.warn(
          ` !: ${url} internal error: "${msg._text}", at "${msg._location.url}"`
        );
      }
    }
  });

  // puppeteer strip wayback elements
  await page.evaluate(() => {
    // wayback banner
    let element = document.querySelector("#wm-ipp-base");
    if (element) {
      element.parentNode.removeChild(element);
    }

    // stylesheets
    const wbSheets = ["banner-styles.css", "iconochive.css"];
    for (str of wbSheets) {
      const sheets = document.querySelectorAll(`link[href*="${str}"`);
      if (sheets) {
        sheets.forEach(element => element.parentNode.removeChild(element));
      }
    }
  });

  // puppeteer gather stylesheets
  const stylesheets = await page.evaluate(() => {
    return Object.keys(document.styleSheets).map(key => {
      try {
        return {
          href:
            document.styleSheets[key].href === null
              ? "inline"
              : document.styleSheets[key].href,
          found: true,
          rules: document.styleSheets[key].cssRules.length
        };
      } catch (err) {
        // Chromium does not like CSS from external sources (CORS); not much I can do about it.
        if (err.name === "SecurityError") {
          return {
            href:
              document.styleSheets[key].href === null
                ? "inline"
                : document.styleSheets[key].href,
            found: false,
            rules: 0
          };
        } else {
          throw err;
        }
      }
    });
  });

  // puppeteer gather anchors (links)
  const anchors = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(`a`)).map(a => a.href);
  });

  return {
    url,
    title: await page.title(),
    accessed: moment.utc().format(),
    stylesheets,
    // anchors: anchors, // trebles size of db record
    agent: {
      name: "Node.js/Puppeteer",
      url: "https://github.com/GoogleChrome/puppeteer",
      version: packageJson.dependencies.puppeteer
    },
    metrics: {
      puppeteer: await page.metrics(),
      anchors: await anchors.length,
      css: {
        stylesheetsWithZeroStyles: stylesheets.reduce((acc, val) => {
          return val.rules == 0 ? acc + 1 : acc;
        }, 0),
        totalStyles: stylesheets.reduce((acc, val) => acc + val.rules, 0)
      }
    }
  };
}

async function getRaw(url) {
  // retrieve raw archive HTML from superagent, and output to file
  const rawHtml = await request.get(url);

  // retrieve internal page elements
  const $ = cheerio.load(rawHtml.text);
  const rawTitle = $("title").text();
  const elementQty = $("html *").length;

  const output = {
    url,
    title: rawTitle,
    accessed: moment.utc().format(),
    agent: {
      name: "Node.js/Superagent",
      url: "https://github.com/visionmedia/superagent",
      version: packageJson.dependencies.superagent
    },
    metrics: {
      elementQty: elementQty,
      charCount: rawHtml.text.length
    },
    response: {
      status: rawHtml.status,
      type: rawHtml.type,
      headers: rawHtml.header,
      text: rawHtml.text
    }
  };

  return output;
}

/**
 * Get data from the Builtwith API
 */
async function getBuiltWith(url) {
  // https://api.builtwith.com/v13/api.json?KEY=f857bd0a-cc11-43fa-bdec-112308e8ba1e&LOOKUP=lib.asu.edu
  // const response = await request.get("ipv4bot.whatismyipaddress.com");
  // const ip = response.text;

  const query = { url };
  const api = "https://api.builtwith.com/v13/api.json";

  const inDatabase = (await builtwith_db.count(query)) > 0;

  if (overwrite || !inDatabase) {
    const full_url = `${api}?KEY=${
      process.env.BUILTWITH_API_KEY
    }&LOOKUP=${encodeURIComponent(url)}`;

    const response = await request.get(full_url);
    const data = Object.assign(query, {
      api,
      accessed: moment.utc().format(),
      data: JSON.parse(response.text)
    });

    // save for later, to reduce API calls
    await builtwith_db.update(query, data, {
      upsert: true
    });
    return data;
  } else {
    return await builtwith_db.findOne(query);
  }
}

/**
 * Get data from the Wayback Machine
 * @param {string} url - A full url string.
 * @param {date} date - A moment date.
 * @param {boolean} raw - Whether or not the actual raw HTML is desired.
 */
function waybackUrl(date, url, raw = false) {
  return raw
    ? `http://web.archive.org/web/${date.format(waybackDateFormat)}id_/${url}`
    : `http://web.archive.org/web/${date.format(waybackDateFormat)}/${url}`;
}

/**
 * Get nearest available date from Wayback Machine
 * @param {string} url - A full url string.
 * @param {date} date - A moment date.
 */
async function getWaybackDate(date, url) {
  // inquire with wayback for archived site closest in time to input date
  const availableResponse = await request.get(
    `https://archive.org/wayback/available?url=${url}/&timestamp=${date.format(
      waybackDateFormat
    )}`
  );

  if (
    availableResponse.body.archived_snapshots.closest &&
    availableResponse.body.archived_snapshots.closest.timestamp
  ) {
    // determine date and actual Wayback URLs from superagent
    return moment.utc(
      availableResponse.body.archived_snapshots.closest.timestamp,
      waybackDateFormat
    );
  }
}

/**
 * Simplified csv input.
 * @param {string} csv - A path to a CSV file.
 */
async function readCSV(csv) {
  return csvParse(await fs.promises.readFile(csv, "utf8"), {
    columns: true,
    skip_empty_lines: true
  });
}

async function getLibraryData(url) {
  let output = {};
  const page = await pages_db.findOne({ url });
  const library = (await page)
    ? await libraries_db.findOne({ _id: page.library_id })
    : await libraries_db.findOne({ url: url });
  const college = (await library)
    ? await colleges_db.findOne({ _id: library.college_id })
    : await colleges_db.findOne({ url: url });

  if (page) {
    output["page"] = page;
  }
  if (library) {
    output["library"] = library;
  }
  if (college) {
    output["college"] = college;
  }
  return output;
}

// determine screenshot full path
function screenshotPath(date, url, viewport) {
  const dir = `${screenshotsDir}/${slugifyUrl(url)}`;
  const name = `${date.format(waybackDateFormat)}-${viewport.name}.png`;
  return `${dir}/${name}`;
}

// determine if screenshot exists
async function screenshotExists(date, url, viewport) {
  return await fs.existsSync(screenshotPath(date, url, viewport));
}

// get screenshot from puppeteer
async function takeScreenshot(date, url, page, viewport) {
  const dir = `${screenshotsDir}/${slugifyUrl(url)}`;
  const path = screenshotPath(date, url, viewport);

  const name = `${date.format(waybackDateFormat)}-${viewport.name}.png`;

  // setup screenshot directory
  await fs.promises.mkdir(dir, { recursive: true });
  await page.setViewport(viewport);

  // determine if pic already exists
  if (!(await screenshotExists(date, url, viewport))) {
    await page.screenshot({
      path: path,
      fullPage: viewport.height <= 1 ? true : false
    });
  }

  const calculatedDimensions = await page.evaluate(() => {
    // calculate document height
    // hat tip https://stackoverflow.com/a/1147768/652626
    // get largest height that exists in the document
    const body = document.body;
    const html = document.documentElement;
    const height = Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight
    );

    // getting width is simpler
    const width =
      document.width !== undefined ? document.width : document.body.offsetWidth;

    return { height, width };
  });

  // retrieve actual image dimensions from disk
  const physicalDimensions = imageSize(path);

  return {
    name: name,
    viewport: viewport,
    dimensions: {
      physical: {
        height: physicalDimensions.height,
        width: physicalDimensions.width
      },
      calculated: {
        height: calculatedDimensions.height,
        width: calculatedDimensions.width
      }
    }
  };
}

function slugifyUrl(url) {
  const decoded = decodeURI(url);
  const outputUrl = new URL(decoded);
  const host = outputUrl.hostname.toString().toLowerCase();
  const href = outputUrl.href
    .toString()
    .toLowerCase()
    .replace(/^https?/, "")
    .replace(":", "")
    .replace(/^-+/, "")
    .replace(/^\/+/, "")
    .replace(/-+$/, "")
    .replace(/\/+$/, "")
    .replace(/\//, "-")
    .replace(/\./g, "_");

  const mainSlug = host.split(".").slice(-2, -1);
  return `${mainSlug}-${slugify(href)}`;
}
