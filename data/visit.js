const request = require("superagent");
const fs = require("fs");
const moment = require("moment");
const csvParse = require("csv-parse/lib/sync");
const puppeteer = require("puppeteer");
const log4js = require("log4js");
const args = require("minimist")(process.argv.slice(2));
const Datastore = require("nedb");
const geoip = require("geoip-lite");
const slugify = require("slugify");
const pjson = require('../package.json');

// config
const scrapesDir = "data/scrapes";
const waybackDateFormat = "YYYYMMDDHHmmss";
// const url = args.url;
const startDate = args.startDate ? args.startDate : moment.utc("1995-01-01");
const endDate = args.endDate ? args.endDate : moment();
// const increment = args.increment ? args.increment : "1 year";

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
    const libraries = await readCSV("data/libraries.csv");
    const pages = await readCSV("data/pages.csv");

    // get global ip address
    const response = await request.get("ipv4bot.whatismyipaddress.com");
    const ip = response.text;

    // iterate libraries
    for (const page of pages) {
      // iterate dates
      let date = startDate;
      while (date.isBefore(endDate)) {
        // scrape
        const wb = await scrapeWayback(page.url, date, browser);

        // include ip address and location information
        wb.source = {
          ip: ip,
          geo: geoip.lookup(ip)
        };

        db.insert(wb, function(err, newDoc) {
          // Callback is optional
          // newDoc is the newly inserted document, including its _id
          // newDoc has no key called notToBeSaved since its value was undefined
        });

        date = date.add(1, "years");
      }
    }

    // cleanup
    await browser.close();
  } catch (error) {
    console.error(error);
  }
})();

/**
 * Get data from the Wayback Machine
 * @param {string} url
 * @param {date} dateRequested - A moment date.
 * @param {browser} browser - A Puppeteer browser object.
 */
async function scrapeWayback(url, date, browser) {
  // date format string for moment
  const waybackDateFormat = "YYYYMMDDHHmmss";
  const slug = slugify(url)
    .replace("/", "_")
    .replace("https:", "")
    .replace("http:", "");

  try {
    // setup puppeteer
    const page = await browser.newPage();

    // retrieve next date available from Wayback Machine
    const dateActual = await getWaybackAvailableDate(url, date);

    // build urls
    const wbUrl = waybackUrl(url, dateActual);
    const rawUrl = waybackUrl(url, dateActual, true);

    // puppeteer navigate to page
    await page.goto(wbUrl, {
      waitUntil: "networkidle0"
    });

    // puppeteer strip wayback elements
    await page.evaluate(() => {
      let element = document.querySelector("#wm-ipp");
      element.parentNode.removeChild(element);
    });

    // puppeteer take screenshots
    let screenshots = [];
    for (const viewport of viewports) {
      screenshots.push(
        await screenshot(
          page,
          `${scrapesDir}/screens/${slug}`,
          dateActual,
          viewport
        )
      );
    }

    // retrieve raw archive HTML from superagent, and output to file
    const rawHtml = await request.get(rawUrl);
    const pageDir = `${scrapesDir}/pages/${slug}`;
    await fs.promises.mkdir(pageDir, { recursive: true });
    const pageName = `${dateActual.format(waybackDateFormat)}.html`
    const pageFile = `${pageDir}/${pageName}`;
    if (!fs.existsSync(pageFile)) {
      await fs.promises.writeFile(pageFile, rawHtml.text);
      logger.info(`page OK:   ${pageFile}`);
    } else {
      logger.warn(`page --:   ${pageFile} (exists)`);
    }

    // output
    const output = {
      url: url,
      slug: slug,
      date: dateActual.format(),
      dateScraped: moment.utc().format(),

      // for data from puppeteer, for the most part
      rendered: {
        url: wbUrl,
        agent: {
          name: 'Node.js/Puppeteer',
          url: 'https://github.com/GoogleChrome/puppeteer',
          version: pjson.dependencies.puppeteer
        },
        page: {
          metrics: await page.metrics(),
          title: await page.title()
        },
        browser: {
          userAgent: await browser.userAgent(),
          version: await browser.version()
        },
        screenshots: screenshots
      },

      // for raw HTML, from Superagent
      raw: {
        url: rawUrl,
        agent: {
          name: 'Node.js/Superagent',
          url: 'https://github.com/visionmedia/superagent',
          version: pjson.dependencies.superagent
        },
        response: {
          status: rawHtml.status,
          type: rawHtml.type,
          headers: rawHtml.header
        },
        html: `${pageName}`
      }
    };

    // clean up
    await page.close();

    // finally return output
    return output;
  } catch (error) {
    logger.error(error);
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
  // inquire with wayback for archived site closest in time to input date
  const availableResponse = await request.get(
    `https://archive.org/wayback/available?url=${url}/&timestamp=${date.format(
      waybackDateFormat
    )}`
  );
  // determine date and actual Wayback URLs from superagent
  return moment.utc(
    availableResponse.body.archived_snapshots.closest.timestamp,
    waybackDateFormat
  );
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
 * @param {string} slug - an arbitrary identifier
 * @param {object} viewport
 */
async function screenshot(page, dir, date, viewport) {
  const name = `${date.format(waybackDateFormat)}-${viewport.name}.png`;
  const file = `${dir}/${name}`;
  try {
    // setup screenshot directory
    await fs.promises.mkdir(dir, { recursive: true });
    await page.setViewport(viewport);

    // determine if pic already exists
    if (!fs.existsSync(file)) {
      await page.screenshot({
        path: file,
        fullPage: viewport.height <= 1 ? true : false
        // omitBackground: true
      });
      logger.info(`screen OK: ${file}`);
    } else {
      logger.warn(`screen --: ${file} (exists)`);
    }

    // var _docHeight = (document.height !== undefined) ? document.height : document.body.offsetHeight;
    // var _docWidth = (document.width !== undefined) ? document.width : document.body.offsetWidth;

    return {
      name: name,
      requestedViewport: viewport,
      dimensionsTotal: {
        height: 123,
        width: 789,
      }
    };
  } catch (error) {
    logger.error(`screen !!: ${file}`);
    logger.error(error);
  }
}

async function getHtml(dir, date) {}
