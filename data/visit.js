const request = require("superagent");
const fs = require("fs");
const moment = require("moment");
const csvParse = require("csv-parse/lib/sync");
const puppeteer = require("puppeteer");
const log4js = require("log4js");
const args = require("minimist")(process.argv.slice(2));
const datastore = require("nedb-promise");
const geoip = require("geoip-lite");
const packageJson = require("../package.json");
const imageSize = require("image-size");
const cheerio = require("cheerio");
const slugify = require("slugify");

// config
const screenshotsDir = "data/screenshots";
const waybackDateFormat = "YYYYMMDDHHmmss";
const overwrite = args.overwrite == "true" ? true : false;
const url = args.url;
const startDate = args.startDate
  ? moment.utc(args.startDate)
  : moment.utc("1995-01-01");
const endDate = args.endDate ? moment.utc(args.endDate) : moment();
const increment = args.increment ? args.increment : "100 years";

// setup database
const DB = datastore({ filename: "data/nedb.db", autoload: true });

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
      console.log("");
      console.log(`${date}`);
      // scrape
      if (url) {
        // single page
        const wb = await scrapeWayback(date, url, browser, ip);
      } else {
        // multiple pages
        for (const page of pages) {
          const wb = await scrapeWayback(date, page.url, browser, ip);
        }
      }
      date = date.add(increment.split(" ")[0], increment.split(" ")[1]);
    }

    // cleanup
    await browser.close();
  } catch (error) {
    logger.error(`errortown`);
    // logger.error(error.name, error.message);
    logger.error(error)
  }
})();

/**
 * Get data from the Wayback Machine
 * @param {string} url
 * @param {date} dateRequested - A moment date.
 * @param {browser} browser - A Puppeteer browser object.
 */
async function scrapeWayback(date, url, browser, ip) {
  // date format string for moment
  const waybackDateFormat = "YYYYMMDDHHmmss";

  try {
    // retrieve next date available from Wayback Machine
    const waybackDate = await getWaybackDate(date, url);

    if (waybackDate) {
      // setup puppeteer
      const page = await browser.newPage();

      // determine if data exists in database
      const query = { date: waybackDate.format(), url };
      const inDatabase = (await DB.count(query)) > 0;
      // const item = await DB.findOne(query);

      // const rawExists = (item && item.raw);
      // const renderedExists = (item && item.rendered);
      // const screenshotsExist = ((item && item.screenshots) && item.screenshots.length > 0);

      if (overwrite || !inDatabase) {
        // metadata
        let metadata = {
          url,
          slug: slugifyUrl(url),
          date: waybackDate.format(),
          dateScraped: moment.utc().format(),
          client: {
            ip,
            geo: geoip.lookup(ip)
          }
        };

        // raw HTML from Superagent
        metadata.raw = await getRaw(waybackDate, url);

        // data from Puppeteer
        metadata.rendered = await getRendered(waybackDate, url, page);

        // browser data
        metadata.rendered.browser = {
          userAgent: await browser.userAgent(),
          version: await browser.version()
        };

        // screenshots
        metadata.rendered.screenshots = [];
        for (const viewport of viewports) {
          metadata.rendered.screenshots.push(
            await takeScreenshot(waybackDate, url, page, viewport)
          );
        }

        // write db
        await DB.update({ date: waybackDate.format(), url }, metadata, {
          upsert: true
        });
        if (overwrite) {
          // updated
          logger.info(`OK:        ${waybackDate.format()} ${url} (updated)`);
        } else {
          // created
          logger.info(`OK:        ${waybackDate.format()} ${url} (created)`);
        }
      } else {
        logger.warn(`--:        ${waybackDate.format()} ${url} (exists)`);
        // logger.warn(`            attempted: ${waybackUrl(waybackDate, url)}`);
      }

      // clean up
      await page.close();
    } else {
      logger.warn(`wb !!:    ${url} -- not in Wayback Machine!`);
    }
  } catch (error) {
    // logger.error(`wb !!:    ${date.format()} ${url} (${error.name})`);
  }
}

async function getRendered(date, url, page) {
  // build urls
  const wbUrl = waybackUrl(date, url);

  try {
    // puppeteer navigate to page
    await page.goto(wbUrl, {
      waitUntil: "networkidle0",
      timeout: 30000
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

    return {
      url: wbUrl,
      title: await page.title(),
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
  } catch (error) {
    logger.error(`rend !!:  ${wbUrl} (${error.name})`);
    // logger.error(`          ${wbUrl}`);
    // logger.error(error);
  }
}

async function getRaw(date, url) {
  // get raw website data
  const wbUrl = waybackUrl(date, url, true);

  try {
    // retrieve raw archive HTML from superagent, and output to file
    const rawHtml = await request.get(wbUrl);

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
      response: {
        status: rawHtml.status,
        type: rawHtml.type,
        headers: rawHtml.header,
        text: rawHtml.text
      }
    };

    return output;
  } catch (error) {
    logger.error(`raw !!:   ${date.format()} ${url} (${error.name})`);
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
    logger.error(`avail !!   ${date.format()} ${url} (${error.name})`);
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

  try {
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
    logger.error(`screen !!: ${date.format()} ${url} (${error.name})`);
  }
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
