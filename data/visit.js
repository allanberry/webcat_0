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
    logger.error(error.name, error.message);
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
      const inDatabase =
        (await DB.count({ date: waybackDate.format(), url })) > 0;

      const rawExists = false;
      const renderedExists = false;
      const screenshotsExist = false;

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

      // for raw HTML, from Superagent
      if (overwrite || !rawExists) {
        metadata.raw = await getRaw(waybackDate, url);
      }

      // for data from Puppeteer
      if (overwrite || !renderedExists) {
        metadata.rendered = await getRendered(waybackDate, url, page);
        metadata.rendered.browser = {
          userAgent: await browser.userAgent(),
          version: await browser.version()
        }
      }

      // for screenshots
      if (overwrite || !screenshotsExist) {
        metadata.rendered.screenshots = [];
        for (const viewport of viewports) {
          metadata.rendered.screenshots.push(
            await takeScreenshot(date, url, page, viewport)
          );
        }
      }

      if (!overwrite && inDatabase) {
        logger.warn(`data --:   ${waybackDate.format()} ${url} (exists)`);
      } else {
        await DB.update(
          { date: waybackDate.format(), url },
          metadata,
          { upsert: true }
        );
        if (overwrite) {
          // updated
          logger.info(`data OK:   ${waybackDate.format()} ${url} (updated)`);
        } else {
          // created
          logger.info(`data OK:   ${waybackDate.format()} ${url} (created)`);
        }
      }

      // save to database
      // await DB.update(
      //   { date: waybackDate.format(), url },
      //   {
      //     url,
      //     slug: slugifyUrl(url),
      //     date: waybackDate.format(),
      //     dateScraped: moment.utc().format(),
      //     client: {
      //       ip,
      //       geo: geoip.lookup(ip)
      //     },
      //     rendered,
      //     raw,
      //   },
      //   { upsert: true }
      // );

      // clean up puppeteer
      await page.close();
    } else {
      logger.warn(`wb !!:    ${url} -- not in Wayback Machine!`);
    }
  } catch (error) {
    logger.error(`wb !!:    ${date.format()} ${url}`);
    logger.error(error.name, error.message);
  }
}

async function getRendered(date, url, page) {
  // build urls
  const wbUrl = waybackUrl(date, url);

  try {
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

    return {
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
    logger.error(`render !!:  ${date.format()} ${url}`);
    logger.error(error.name, error.message);
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
    logger.error(`raw !!:   ${date.format()} ${url}`);
    logger.error(error.name, error.message);
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
    logger.error(`avail !!   ${date.format()} ${url}`);
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
      logger.info(`screen OK: ${date.format()} ${path}`);
    } else {
      logger.warn(`screen --: ${date.format()} ${path} (exists)`);
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
    // logger.error(`screen !!: ${date.format()} ${path}`);
    // logger.error(error.name, error.message);
    logger.error(error);
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
