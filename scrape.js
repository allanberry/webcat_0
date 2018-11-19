const puppeteer = require('puppeteer');
const moment = require('moment');
const fs = require('fs');
const yaml = require('js-yaml');
const imgSize = require('image-size');
const util = require('./util.js');
const config = require('./config.json');
const package = require('./package.json');
const axios = require('axios');


(async function () {
  const sites = yaml.safeLoad(fs.readFileSync('sites.yaml', 'utf8'));
  const dates = [
    moment.utc("1900-01-01"), // first
    // moment.utc() // latest
  ]
  const browser = await puppeteer.launch();
  for (const site of sites) {
    for (const date of dates) {
      await scrape(browser, site, date);
    }
  }
  await browser.close();
}());

async function scrape(browser, site, date) {
  const siteDir = `${config.scrapesDir}/${site.slug}`;
  const token = date.format();
  const siteMdFile = `${siteDir}/md.yaml`;
  const currMdFile = `${siteDir}/${token}/md.yaml`;
  const htmlFile = `${siteDir}/${token}/page.html`;
  let siteMetadata;
  let currMetadata;

  // create directory if it doesn't exist
  const currentDir = `${siteDir}/${token}`;
  if (!fs.existsSync(currentDir)){
    util.mkDirByPathSync(currentDir);
  }

  // setup browser
  const page = await browser.newPage();

  try {
    // if date is historical (more than a minute ago), access from wayback machine
    const realUrl = await getRealUrl(site.url, date);

    // initialize site metadata
    if (fs.existsSync(siteMdFile)) {
      // input from file
      await fs.readFile(siteMdFile, 'utf8', async function(err, contents) {
        if(err) { console.error(err); }
        siteMetadata = yaml.safeLoad(contents);
      });
    } else {
      // create from scratch
      siteMetadata = {
        slug: site.slug,
        url: site.url,
        version: package.version
      };
    }

    // initialize current metadata
    currMetadata = {
      screenshots: []
    };

    // retrieve page
    await page.goto(realUrl, {
      waitUntil: 'networkidle0',
    });

    // retrieve html
    // hat tip: https://github.com/GoogleChrome/puppeteer/issues/331#issuecomment-323711582
    const bodyHtml = await page.evaluate(() => {
      return new XMLSerializer().serializeToString(document.doctype) + document.documentElement.outerHTML
    });
    
    // load predetermined sizes, and take screenshot
    for (let key in config.sizes) {
      const val = config.sizes[key];
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
        dateArchived: token,
        dateRetrieved: moment.utc().format(),
        width: dimensions.width,
        height: dimensions.height,
        version: package.version,
        userAgent: await browser.userAgent()
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

    // create square tile for general web display
    // TODO: refactor to crop from another screenshot?
    // TODO: should not happen on every run
    await page.setViewport({
      width: config.tileSize.width,
      height: config.tileSize.height
    });
    await page.screenshot({
      path: `${siteDir}/tile.png`,
      fullPage: false
    });
  } catch(err) {
    console.error(`FAILED: ${site.slug} ${token} -- ${err}`)
  }

  // clean up
  await page.close();
}

// generic function to hit a JSON access point
const getData = async url => {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

const getRealUrl = async (url, date) => {
  if (date.isBefore(moment.utc(), 'minute')) {
    // retrieve url from wayback machine
    const waybackProbeUrl = `https://archive.org/wayback/available?url=${url}&timestamp=${date.format('YYYYMMDDHHmmss')}`;
    const waybackResponse = await getData(waybackProbeUrl);
    return waybackResponse.archived_snapshots.closest.url;
  } else {
    return site.url;
  }
}