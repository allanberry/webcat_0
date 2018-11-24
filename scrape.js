const puppeteer = require('puppeteer');
const moment = require('moment');
const fs = require('fs');
const yaml = require('js-yaml');
const imgSize = require('image-size');
const util = require('./util.js');
const config = require('./config.json');
const package = require('./package.json');
const axios = require('axios');

/**
 * Runs the script.
 */
(async function () {
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
 * Scrapes the internet for a site.
 * @param {browser} browser - A puppeteer browser object.
 * @param {site} inputSite - A site object.
 */
const scrape = async (browser, inputSite, inputDate) => {
  try {
    

    // establish actual site from Wayback Machine
    const workingSite = inputDate.isBefore(moment().utc(), 'day')
      ? await getWayback(inputSite.slug, inputSite.url, inputDate)
      : {
        slug: inputSite.slug,
        url: inputSite.url,
        date: inputDate,
      };

    // only proceed if a workingSite exists
    if (workingSite) {
      // setup browser
      const page = await browser.newPage();

      // setup variables
      const siteDir = `${config.scrapesDir}/${workingSite.slug}`;
      const token = workingSite.date.format();
      const siteMdFile = `${siteDir}/md.yaml`;
      const currentDir = `${siteDir}/${token}`;
      const currMdFile = `${siteDir}/${token}/md.yaml`;
      const htmlFile =   `${siteDir}/${token}/page.html`;

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
          version: package.version
        };
      }

      // retrieve page
      await page.goto(workingSite.url, {
        waitUntil: 'networkidle0',
      });

      // retrieve html
      // hat tip: https://github.com/GoogleChrome/puppeteer/issues/331#issuecomment-323711582
      const bodyHtml = await page.evaluate(() => {
        return new XMLSerializer().serializeToString(document.doctype) + document.documentElement.outerHTML
      });
      
      // load predetermined sizes, and take screenshot
      let currMetadata = {
        urlRetrieved: workingSite.url,
        dateArchived: token,
        dateRetrieved: moment.utc().format(),
        version: package.version,
        userAgent: await browser.userAgent(),
        screenshots: []
      };
      for (let key in config.defaultSizes) {
        const val = config.defaultSizes[key];
        const filename = `${key}.png`;
        const imgPath = `${siteDir}/${token}/${filename}`;
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

      // output HTML
      await fs.writeFile(htmlFile, bodyHtml, function(err) {
        if(err) { console.error(err); }
      });

      // report to console
      console.log(`OK: ${workingSite.slug} - ${token}`);

      // clean up
      await page.close();
    }
  } catch(error) {
    console.error(error)
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
    };
  } catch (error) {
    console.error(error);
  }
}
