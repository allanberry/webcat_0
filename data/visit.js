const request = require("superagent");
const fs = require("fs");
const moment = require("moment");
const csvParse = require("csv-parse/lib/sync");
const puppeteer = require("puppeteer");
const log4js = require("log4js");
const args = require("minimist")(process.argv.slice(2));

// config
// const url = args.url;
const startDate = args.startDate ? args.startDate : moment.utc("1995-01-01");
const endDate = args.endDate ? args.endDate : moment();
// const increment = args.increment ? args.increment : "1 year";

const screenshotsDir = "data/scrapes/screens";
const wbFormat = "YYYYMMDDHHmmss";

const logger = setupLogger();

/**
 * Main process.
 */
(async () => {
  try {
    // setup
    const browser = await puppeteer.launch();
    const libraries = await readCSV("data/libraries.csv");

    // iterate libraries
    for (const library of libraries) {
      // iterate dates
      let date = startDate;
      // while (date.isBefore(endDate)) {
      // scrape
      const wb = await scrapeWayback(library.slug, library.url, date, browser);

      // console.log(wb);

      // date = date.add(1, "years");
      // }
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
async function scrapeWayback(slug, url, date, browser) {
  // date format string for moment
  const wbFormat = "YYYYMMDDHHmmss";

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
    await screenshots(page, screenshotsDir, slug, dateActual);

    // retrieve raw archive HTML from superagent
    const rawHtml = await request.get(rawUrl);

    // output
    const output = {
      url: url,
      date: dateActual.format(),
      dateScraped: moment.utc().format(),

      // for data from puppeteer, for the most part
      rendered: {
        url: wbUrl,
        page: {
          metrics: await page.metrics(),
          title: await page.title()
        },
        browser: {
          userAgent: await browser.userAgent(),
          version: await browser.version()
        }
      },

      // for raw HTML, from Superagent
      raw: {
        url: rawUrl,
        response: {
          status: rawHtml.status,
          type: rawHtml.type,
          headers: rawHtml.header
        }
      }
    };

    // clean up
    await page.close();

    // // output metadata
    // const mdFile = `${metaDir}/${library.slug}-${dateActual.format(wbFormat)}.json`;
    // if (!fs.existsSync(mdFile)) {
    //   await fs.promises.writeFile(mdFile, JSON.stringify(output));
    //   logger.info(`meta OK:   ${library.slug}-${dateActual.format(wbFormat)}.json`);
    // } else {
    //   logger.warn(
    //     `meta --:   ${library.slug}-${dateActual.format(wbFormat)}.json (exists)`
    //   );
    // }

    // // output raw html
    // const pageFile = `${pagesDir}/${library.slug}-${dateActual.format(
    //   wbFormat
    // )}.html`;
    // if (!fs.existsSync(pageFile)) {
    //   await fs.promises.writeFile(pageFile, waybackRaw.text);
    //   logger.info(`page OK:   ${library.slug}-${dateActual.format(wbFormat)}.html`);
    // } else {
    //   logger.warn(
    //     `page --:   ${library.slug}-${dateActual.format(wbFormat)}.html (exists)`
    //   );
    // }

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
    ? `http://web.archive.org/web/${date.format(wbFormat)}id_/${url}`
    : `http://web.archive.org/web/${date.format(wbFormat)}/${url}`;
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
      wbFormat
    )}`
  );
  // determine date and actual Wayback URLs from superagent
  return moment.utc(
    availableResponse.body.archived_snapshots.closest.timestamp,
    wbFormat
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
 * Get screenshots from puppeteer
 * @param {page} page - A puppeteer page
 * @param {path} path - a local directory path
 * @param {string} slug - an arbitrary identifier
 * @param {string} date - A moment date.
 */
async function screenshots(page, path, slug, date) {
  const viewports = {
    // "0001x0001": {
    //   width: 1,
    //   height: 1,
    //   // isMobile: false,
    //   isLandscape: false
    // },
    "0600": {
      width: 600,
      height: 1
      // isMobile: true,
      // isLandscape: false
    },
    "1200": {
      width: 1200,
      height: 1
      // isMobile: false,
      // isLandscape: true
    }
  };

  try {
    // setup screenshot directory
    await fs.promises.mkdir(path, { recursive: true });

    for (const v in viewports) {
      await page.setViewport(viewports[v]);

      const screenFile = `${slug}-${date.format(wbFormat)}-${v}.png`;
      const screenPath = `${path}/${screenFile}`;

      // determine if pic already exists
      if (!fs.existsSync(screenPath)) {
        await page.screenshot({
          path: screenPath,
          fullPage: true,
          omitBackground: true
        });
        logger.info(`screenshot OK: ${screenFile}`);
      } else {
        logger.warn(`screenshot --: ${screenFile} (exists)`);
      }
    }
  } catch (error) {
    logger.error(`screenshot !!: ${slug}-${date.format(wbFormat)}`);
    logger.error(error);
  }
}

/**
 * Get data from Puppeteer
 */
async function getPageData(page, url) {
  // setup filesystem
  // const metaDir = `data/scrapes/meta`;
  // const pagesDir = `data/scrapes/pages`;
  // const screensDir = `data/scrapes/screens`;
  // await fs.promises.mkdir(metaDir, { recursive: true });
  // await fs.promises.mkdir(pagesDir, { recursive: true });
  // await fs.promises.mkdir(screensDir, { recursive: true });

  // puppeteer
  try {
    // const viewports = {
    //   // "0001x0001": {
    //   //   width: 1,
    //   //   height: 1,
    //   //   // isMobile: false,
    //   //   isLandscape: false
    //   // },
    //   "0600": {
    //     width: 600,
    //     height: 1
    //     // isMobile: true,
    //     // isLandscape: false
    //   },
    //   "1200": {
    //     width: 1200,
    //     height: 1
    //     // isMobile: false,
    //     // isLandscape: true
    //   }
    // };

    // scraping
    // for (const v in viewports) {

    // Navigate to page
    // await page.goto(url, {
    //   waitUntil: "networkidle0"
    //   // timeout: 100000
    // });

    // // strip wayback div
    // await page.evaluate(() => {
    //   let waybackDiv = document.querySelector("#wm-ipp");
    //   waybackDiv.parentNode.removeChild(waybackDiv);
    // });
    // await page.setViewport(viewports[v]);

    // // take screenshots
    // const screenFile = `${screensDir}/${library.slug}-${date.format(
    //   wbFormat
    // )}-${v}.png`;
    // if (!fs.existsSync(screenFile)) {
    //   await page.screenshot({
    //     path: screenFile,
    //     fullPage: true,
    //     omitBackground: true
    //   });
    //   logger.info(
    //     `screen OK: ${library.slug}-${date.format(wbFormat)}-${v}.png`
    //   );
    // } else {
    //   logger.warn(
    //     `screen --: ${library.slug}-${date.format(
    //       wbFormat
    //     )}-${v}.png (exists)`
    //   );
    // }

    return {
      metrics: await page.metrics(),
      title: await page.title()
      // browser: {
      //   userAgent: await browser.userAgent(),
      //   version: await browser.version()
      // }
    };

    // }
  } catch (error) {
    // logger.error(
    //   `screen FAIL: ${library.slug}-${date.format(wbFormat)} error: ${
    //     error.name
    //   } url: ${waybackUrl}`
    // );
    // logger.error(error);
    // console.log(
    //   `${colors.red("scrn NO")}: ${date.format(wbFormat)} ${
    //     library.slug
    //   } (${colors.red(error.name)})`
    //   // error
    // );
    logger.error(error);
  }
}
