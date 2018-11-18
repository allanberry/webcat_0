const puppeteer = require('puppeteer');
const moment = require('moment');
const fs = require('fs');
const yaml = require('js-yaml');
const imgSize = require('image-size');
const util = require('./util.js');
const config = require('./config.json');

(async function () {
  const sites = yaml.safeLoad(fs.readFileSync('sites.yaml', 'utf8'));
  const date = moment().utc();

  const browser = await puppeteer.launch();
  for (const site of sites) {
    await scrape(browser, site, date);
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

  // setup
  const page = await browser.newPage();

  // create directory if it doesn't exist
  const currentDir = `${siteDir}/${token}`;
  if (!fs.existsSync(currentDir)){
    util.mkDirByPathSync(currentDir);
  }

  try {
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
        created: date.format(),
        version: config.version
      };
    }

    // initialize current metadata
    currMetadata = {
      screenshots: []
    };

    // load page
    await page.goto(site.url, {
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
        accessed: date.format(),
        width: dimensions.width,
        height: dimensions.height,
        version: config.version,
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
