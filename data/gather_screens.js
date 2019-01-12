const puppeteer = require("puppeteer");
const moment = require("moment");
const fs = require("fs");
const yaml = require("js-yaml");
const imgSize = require("image-size");
const axios = require("axios");
const colors = require("colors/safe");
const csvParse = require("csv-parse/lib/sync");

const util = require("../gather/util.js");
const pack = require("../package.json");

/* eslint-disable no-console */

/**
 * @file Collects website data from the web, especially using scrapes from the Wayback Machine.
 */

const config = {
  scrapesDir: "data",
  startDate: "1995-01-01",
  tileSize: {
    x: 0,
    y: 0,
    width: 600,
    height: 600
  },
  defaultSizes: {
    "0600x0": {
      width: 600,
      height: 0
    },
    "1200x0": {
      width: 1200,
      height: 0
    }
  }
};

/**
 * Runs the script.
 */
(async function main() {
  try {
    const browser = await puppeteer.launch();

    // parse colleges
    const collegesCSV = fs.readFileSync("gather/colleges.csv", "utf8");
    const colleges = csvParse(collegesCSV, {
      columns: true,
      skip_empty_lines: true
    });

    // scrape sites
    for (const college of colleges) {
      // convert dates to a more useful format
      // const dates = site.dates
      //   ? site.dates.map(date => moment.utc(date))
      //   : config.defaultDates.map(date => moment.utc(date));

      // once for each date
      for (
        const date = moment.utc(config.startDate);
        date.diff(moment(), "days") <= 0;
        date.add(6, "months")
      ) {
        await scrape(browser, college, date);
        // console.log(d);
      }

      // finish by scraping current site
      // await scrape(browser, site, moment.utc());
    }
    await browser.close();
  } catch (error) {
    console.error(error);
  }
})();

/**
 * Scrapes the internet for a site, and archives it.
 * @param {browser} browser - A puppeteer browser object.
 * @param {site} college - A site object to be archived.
 */
const scrape = async (browser, college, inputDate) => {
  try {
    // If the site is historical, deal with the Wayback Machine.
    // Otherwise, initialize a new internal site object "workingSite".
    const workingSite = inputDate.isBefore(moment().utc(), "day")
      ? await getWayback(college._id, college.library_url, inputDate)
      : {
          slug: college._id,
          url: college.library_url,
          date: inputDate,
          wayback: false
        };

    // workingSite will be null if the WM does not have any archived sites,
    // so make sure it exists before proceeding.
    if (workingSite) {
      // setup browser
      const page = await browser.newPage();

      // setup variables
      const siteDir = `${config.scrapesDir}/${workingSite.slug}`;
      const dateToken = workingSite.date.format();
      const siteMdFile = `${siteDir}/md.yaml`;
      const currentDir = `${siteDir}/${dateToken}`;
      const currMdFile = `${siteDir}/${dateToken}/md.yaml`;
      const htmlFile = `${siteDir}/${dateToken}/page.html`;
      // const cssFile = `${siteDir}/${dateToken}/styles.css`;

      // create directory if it doesn't exist; else, skip
      if (!fs.existsSync(currentDir)) {
        util.mkDirByPathSync(currentDir);

        try {
          // initialize site metadata
          let siteMetadata;
          if (fs.existsSync(siteMdFile)) {
            // input from file
            await fs.readFile(siteMdFile, "utf8", async function(
              err,
              contents
            ) {
              if (err) {
                console.error(err);
              }
              siteMetadata = yaml.safeLoad(contents);
            });
          } else {
            // create from scratch
            siteMetadata = {
              slug: workingSite.slug,
              url: workingSite.url,
              version: pack.version
            };
          }

          // retrieve page
          await page.goto(workingSite.url, {
            waitUntil: "networkidle0"
          });

          // retrieve and save css
          // const css = await minimalcss.minimize({
          //   browser: browser,
          //   styletags: true,
          //   urls: [workingSite.url] });
          // await fs.writeFile(cssFile, await css.finalCss,
          //   (err) => {
          //     if(err) { console.error(err); }
          // });

          // retrieve html
          // adding "id_" to the date string gets the original (non-wayback) html
          // save HTML
          await fs.writeFile(
            htmlFile,
            await getData(workingSite.url.replace(/\d{14}/, "$&id_")),
            err => {
              if (err) {
                console.error(err);
              }
            }
          );

          // modify page to remove Wayback Machine elements, before taking screenshots
          if (workingSite.wayback) {
            await page.evaluate(() => {
              let dom = document.querySelector("#wm-ipp");
              dom.parentNode.removeChild(dom);
            });
          }

          // retrieve predetermined sizes, and take screenshots
          let currMetadata = {
            urlRetrieved: workingSite.url,
            wayback: workingSite.wayback,
            dateArchived: dateToken,
            dateRetrieved: moment.utc().format(),
            version: pack.version,
            userAgent: await browser.userAgent(),
            screenshots: []
          };

          /*
          for (let key in config.defaultSizes) {
            const val = config.defaultSizes[key];
            const filename = `${key}.png`;
            const imgPath = `${siteDir}/${dateToken}/${filename}`;

            // set width and height
            await page.setViewport(val);

            // take screenshot
            await page.screenshot({
              path: imgPath, // path relative to site root
              fullPage: true
            });

            // record metadata about screenshot
            const dimensions = imgSize(imgPath); // TODO? make async (doesn't seem like a big deal)
            currMetadata.screenshots.push({
              filename: filename,
              width: dimensions.width,
              height: dimensions.height
            });
          }
          */

          // output metadata
          await fs.writeFile(siteMdFile, yaml.safeDump(siteMetadata), function(
            err
          ) {
            if (err) {
              console.error(err);
            }
          });
          await fs.writeFile(currMdFile, yaml.safeDump(currMetadata), function(
            err
          ) {
            if (err) {
              console.error(err);
            }
          });

          // report to console
          console.log(colors.green(`Ok: ${workingSite.slug} - ${dateToken}`));

          // clean up
          await page.close();
        } catch (error) {
          console.error(
            colors.red(`${error.name}: ${workingSite.slug} - ${dateToken}`)
          );

          // delete directory if exists
          if (fs.existsSync(currentDir)) {
            fs.rmdir(currentDir, error => error);
          }
        }
      } else {
        console.log(colors.yellow(`Exists: ${college.slug} - ${dateToken}`));
      }
    } else {
      console.log(
        colors.yellow(
          `No site exists for ${college.slug} (${
            college.url
          } - ${inputDate})`
        )
      );
    }
  } catch (error) {
    console.error(error);
  }
};

/**
 * Generic function to hit a JSON access point.
 * @param {string} url - A url to get data from.
 */
const getData = async url => {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

/**
 * Retrieve workingSite from wayback machine.
 * @param {string} slug - An identifier.
 * @param {string} url - A url to get data from the Wayback machine.
 * @param {moment} date - A moment date object.
 * @returns {workingSite|null} - a workingSite object.
 */
const getWayback = async (slug, url, date) => {
  try {
    const waybackProbeUrl = `https://archive.org/wayback/available?url=${url}&timestamp=${date.format(
      "YYYYMMDDHHmmss"
    )}`;
    const waybackResponse = await getData(waybackProbeUrl);

    // if waybackResponse.archived_snapshots is empty, abort
    const obj = waybackResponse.archived_snapshots;

    if (Object.keys(obj).length === 0) {
      return null;
    }
    return {
      // workingSite object
      slug: slug,
      url: waybackResponse.archived_snapshots.closest.url,
      date: moment.utc(
        waybackResponse.archived_snapshots.closest.timestamp,
        "YYYYMMDDHHmmss"
      ),
      wayback: true
    };
  } catch (error) {
    console.error(error);
  }
};
