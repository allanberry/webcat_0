const puppeteer = require('puppeteer');
const moment = require('moment');
const fs = require('fs');
const yaml = require('js-yaml');
const imgSize = require('image-size');
const axios = require('axios');
const minimalcss = require('minimalcss');
const colors = require('colors/safe');
const util = require('./util.js');
const config = require('./config.json');
const pack = require('./package.json');


/**
 * Runs the script.
 */
(async function main () {
  try {
    const sites = yaml.safeLoad(fs.readFileSync('sites.yaml', 'utf8'));
    const browser = await puppeteer.launch();
    for (const site of sites) {

      // convert dates to a more useful format
      const dates = site.dates
        ? site.dates.map(date => moment.utc(date))
        : config.defaultDates.map(date => moment.utc(date));    

      // scrape once for each date
      for (const date of dates) {
        await scrape(browser, site, date);
      }

      // finish by scraping current site
      await scrape(browser, site, moment.utc());
    }
    await browser.close();
  } catch (error) {
    console.error(error);
  }
}());


/**
 * Scrapes the internet for a site, and archives it.
 * @param {browser} browser - A puppeteer browser object.
 * @param {site} inputSite - A site object to be archived.
 */
const scrape = async (browser, inputSite, inputDate) => {
  try {
    
    // If the site is historical, deal with the Wayback Machine.
    // Otherwise, initialize a new internal site object "workingSite".
    const workingSite = inputDate.isBefore(moment().utc(), 'day')
      ? await getWayback(inputSite.slug, inputSite.url, inputDate)
      : {
        slug: inputSite.slug,
        url: inputSite.url,
        date: inputDate,
        wayback: false,
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
      const cssFile = `${siteDir}/${dateToken}/styles.css`;

      // create directory if it doesn't exist
      if (!fs.existsSync(currentDir)){
        util.mkDirByPathSync(currentDir);
      }

      // initialize site metadata
      let siteMetadata;
      if (fs.existsSync(siteMdFile)) {
        // input from file
        await fs.readFile(siteMdFile, 'utf8', async function(err, contents) {
          if(err) { console.error(err); }
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
        waitUntil: 'networkidle0',
      });

      // retrieve and save css
      const css = await minimalcss.minimize({
        browser: browser,
        styletags: true,
        urls: [workingSite.url] });
      await fs.writeFile(cssFile, await css.finalCss,
        (err) => {
          if(err) { console.error(err); }
      });

      // retrieve html
      // adding "id_" to the date string gets the original (non-wayback) html
      // save HTML
      await fs.writeFile(htmlFile,
        await getData(workingSite.url.replace(/\d{14}/, '$&id_')),
        (err) => {
          if(err) { console.error(err); }
      });

      // modify page to remove Wayback Machine elements, before taking screenshots
      if (workingSite.wayback) {
        await page.evaluate(() => {
          let dom = document.querySelector('#wm-ipp');
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
          height: dimensions.height,
        })
      }

      // output metadata
      await fs.writeFile(siteMdFile, yaml.safeDump(siteMetadata), function(err) {
        if(err) { console.error(err); }
      });
      await fs.writeFile(currMdFile, yaml.safeDump(currMetadata), function(err) {
        if(err) { console.error(err); }
      });

      // report to console
      console.log(colors.green(`Ok:   ${workingSite.slug} - ${dateToken}`));

      // clean up
      await page.close();
    } else {
      console.log(colors.warn(`No site exists for ${inputSite.slug} (${inputSite.url} - ${inputDate})`))
    }
  } catch(error) {
    // console.error(error)
    console.log(colors.red(`Fail: ${workingSite.slug} - ${dateToken}`));
  }  
}


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
    const waybackProbeUrl = `https://archive.org/wayback/available?url=${url}&timestamp=${date.format('YYYYMMDDHHmmss')}`;
    const waybackResponse = await getData(waybackProbeUrl);

    // if waybackResponse.archived_snapshots is empty, abort
    const obj = waybackResponse.archived_snapshots;

    if (Object.keys(obj).length === 0) {
      return null;
    }
    return { // workingSite object
      slug: slug,
      url: waybackResponse.archived_snapshots.closest.url,
      date: moment.utc(waybackResponse.archived_snapshots.closest.timestamp, 'YYYYMMDDHHmmss'),
      wayback: true
    };
  } catch (error) {
    console.error(error);
  }
}
