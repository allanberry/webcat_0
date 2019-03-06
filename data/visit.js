const request = require("superagent");
const fs = require("fs");
const moment = require("moment");
const csvParse = require("csv-parse/lib/sync");
const puppeteer = require("puppeteer");
const log4js = require("log4js");
const args = require("minimist")(process.argv.slice(2));
const Datastore = require("nedb");
const geoip = require("geoip-lite");
const packageJson = require("../package.json");
const imageSize = require("image-size");
const cheerio = require("cheerio");
const slugify = require("slugify");

// config
const scrapesDir = "data/scrapes";
const waybackDateFormat = "YYYYMMDDHHmmss";
const url = args.url;
const startDate = args.startDate ? args.startDate : moment.utc("1995-01-01");
const endDate = args.endDate ? args.endDate : moment();
const increment = args.increment ? args.increment : "100 years";

// setup database
const db = new Datastore({ filename: "data/nedb.db", autoload: true });

// setup logger
const logger = setupLogger();

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
  try {
    // setup
    const browser = await puppeteer.launch();
    const pages = await readCSV("data/pages.csv");

    // get global ip address
    const response = await request.get("ipv4bot.whatismyipaddress.com");
    const ip = response.text;

    // iterate dates
    let date = startDate;
    while (date.isBefore(endDate)) {
      // scrape
      if (url) {
        // single page
        const wb = await scrapeWayback(url, date, browser, ip);
      } else {
        // multiple pages
        for (const page of pages) {
          const wb = await scrapeWayback(page.url, date, browser, ip);
        }
      }
      date = date.add(increment.split(" ")[0], increment.split(" ")[1]);
    }

    // cleanup
    await browser.close();
  } catch (error) {
    logger.error(`errortown`);
    logger.error(error.name, error.message);
  }
})();

/**
 * Get data from the Wayback Machine
 * @param {string} url
 * @param {date} dateRequested - A moment date.
 * @param {browser} browser - A Puppeteer browser object.
 */
async function scrapeWayback(url, date, browser, ip) {
  // date format string for moment
  const waybackDateFormat = "YYYYMMDDHHmmss";

  const slug = slugifyUrl(url);

  // retrieve next date available from Wayback Machine
  const dateActual = await getWaybackAvailableDate(url, date);

  if (!dateActual) {
    logger.warn(`wb !!:    ${url} -- not in Wayback Machine!`);
  } else {
    try {
      // output
      const output = {
        url: url,
        slug: slug,
        date: dateActual.format(),
        dateScraped: moment.utc().format(),
        client: {
          ip: ip,
          geo: geoip.lookup(ip)
        },

        // for data from puppeteer, for the most part
        rendered: await getRendered(url, dateActual, slug, browser),

        // for raw HTML, from Superagent
        raw: await getRaw(url, dateActual, slug)
      };

      // update database
      db.insert(output);
      logger.info(`data OK:   ${date.format()} ${url}`);
    } catch (error) {
      logger.error(`wb !!:    ${date.format()} ${url}`);
      logger.error(error.name, error.message);
    }
  }
}

async function getRendered(url, date, slug, browser) {
  // build urls
  const wbUrl = waybackUrl(url, date);

  try {
    // setup puppeteer
    const page = await browser.newPage();

    // puppeteer navigate to page
    await page.goto(wbUrl, {
      waitUntil: "networkidle0"
    });

    // puppeteer strip wayback elements
    await page.evaluate(() => {
      // wayback banner
      let element = document.querySelector("#wm-ipp");
      element.parentNode.removeChild(element);

      // stylesheets
      const wbSheets = ["banner-styles.css", "iconochive.css"];
      for (str of wbSheets) {
        let element = document.querySelectorAll(`link[href*="${str}"`)[0];
        element.parentNode.removeChild(element);
      }
    });

    // puppeteer gather stylesheets
    const stylesheets = await page.evaluate(() => {
      return Object.keys(document.styleSheets).map(key => {
        return {
          href:
            document.styleSheets[key].href === null
              ? "inline"
              : document.styleSheets[key].href,
          rules: document.styleSheets[key].rules.length
        };
      });
    });

    // puppeteer gather anchors (links)
    const anchors = await page.evaluate(() => {
      return Array.from(document.querySelectorAll(`a`)).map(a => a.href);
    });

    // puppeteer take screenshots
    let screenshots = [];
    for (const viewport of viewports) {
      screenshots.push(await screenshot(date, slug, page, viewport));
    }

    const output = {
      url: wbUrl,
      title: await page.title(),
      stylesheets: stylesheets,
      // anchors: anchors, // trebles size of db record
      agent: {
        name: "Node.js/Puppeteer",
        url: "https://github.com/GoogleChrome/puppeteer",
        version: packageJson.dependencies.puppeteer
      },
      metrics: {
        puppeteer: await page.metrics(),
        anchors: anchors.length,
        css: {
          stylesheetsWithZeroStyles: stylesheets.reduce((acc, val) => {
            return val.rules == 0 ? acc + 1 : acc;
          }, 0),
          totalStyles: stylesheets.reduce((acc, val) => acc + val.rules, 0)
        }
      },
      browser: {
        userAgent: await browser.userAgent(),
        version: await browser.version()
      },
      screenshots: screenshots
    };

    // clean up
    await page.close();

    return output;
  } catch (error) {
    logger.error(`render !!:  ${wbUrl}`);
    logger.error(error.name, error.message);
  }
}

async function getRaw(url, date, slug) {
  // get raw website data
  const wbUrl = waybackUrl(url, date, true);

  try {
    // retrieve raw archive HTML from superagent, and output to file
    const rawHtml = await request.get(wbUrl);
    const pageDir = `${scrapesDir}/${slug}/pages`;
    await fs.promises.mkdir(pageDir, { recursive: true });
    const pageName = `${date.format(waybackDateFormat)}.html`;
    const path = `${pageDir}/${pageName}`;
    const shortpath = `${slug}/pages/${pageName}`;

    // retrieve internal page elements
    const $ = cheerio.load(rawHtml.text);
    const rawTitle = $("title").text();
    const elementQty = $("html *").length;

    const output = {
      url: wbUrl,
      title: rawTitle,
      agent: {
        name: "Node.js/Superagent",
        url: "https://github.com/visionmedia/superagent",
        version: packageJson.dependencies.superagent
      },
      metrics: {
        elementQty: elementQty,
        charCount: rawHtml.text.length
      },
      html: `${pageName}`,
      response: {
        status: rawHtml.status,
        type: rawHtml.type,
        headers: rawHtml.header
      }
    };

    if (!fs.existsSync(path)) {
      await fs.promises.writeFile(path, rawHtml.text);
      logger.info(`raw OK:    ${shortpath}`);
    } else {
      logger.warn(`raw --:    ${shortpath} (exists)`);
    }

    return output;
  } catch (error) {
    logger.error(`raw !!:   ${wbUrl}`);
    logger.error(error.name, error.message);
  }
}

/**
 * Get data from the Wayback Machine
 * @param {string} url - A full url string.
 * @param {date} date - A moment date.
 * @param {boolean} raw - Whether or not the actual raw HTML is desired.
 */
function waybackUrl(url, date, raw = false) {
  return raw
    ? `http://web.archive.org/web/${date.format(waybackDateFormat)}id_/${url}`
    : `http://web.archive.org/web/${date.format(waybackDateFormat)}/${url}`;
}

/**
 * Get nearest available date from Wayback Machine
 * @param {string} url - A full url string.
 * @param {date} date - A moment date.
 */
async function getWaybackAvailableDate(url, date) {
  try {
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
  } catch (error) {
    logger.error(error);
  }
}

/**
 * A logger to track script progress.
 */
function setupLogger() {
  // logger
  const logger = log4js.getLogger();
  logger.level = "debug";
  log4js.configure({
    appenders: {
      out: { type: "stdout" },
      app: { type: "file", filename: "log/scrape.log" }
    },
    categories: {
      default: { appenders: ["out", "app"], level: "debug" }
    }
  });
  return logger;
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

/**
 * Get screenshot from puppeteer
 * @param {page} page - A puppeteer page
 * @param {string} dir - a local directory path
 * @param {date} date
 * @param {object} viewport
 */
async function screenshot(date, slug, page, viewport) {
  const dir = `${scrapesDir}/${slug}/screens`;
  const name = `${date.format(waybackDateFormat)}-${viewport.name}.png`;
  const path = `${dir}/${name}`;
  const shortpath = `${slug}/screens/${name}`;
  try {
    // setup screenshot directory
    await fs.promises.mkdir(dir, { recursive: true });
    await page.setViewport(viewport);

    // determine if pic already exists
    if (!fs.existsSync(path)) {
      await page.screenshot({
        path: path,
        fullPage: viewport.height <= 1 ? true : false
      });
      logger.info(`screen OK: ${shortpath}`);
    } else {
      logger.warn(`screen --: ${shortpath} (exists)`);
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
        document.width !== undefined
          ? document.width
          : document.body.offsetWidth;

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
  } catch (error) {
    logger.error(`screen !!: ${date.format()} ${slug}`);
    logger.error(error.name, error.message);
  }
}

function slugifyUrl(urlInput) {
  const decoded = decodeURI(urlInput);
  const url = new URL(decoded);

  // const output = decoded
  //   .toString()
  //   .toLowerCase()
  //   .replace(/^https?:\/\//, "")
  //   .replace(/^-+/, "")
  //   .replace(/-+$/, "")
  //   .replace(/\/+$/, "")
  //   .replace(/\//, "-")
  //   .replace(/\./g, "_");

  const host = url.hostname.toString().toLowerCase();

  const href = url.href
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
