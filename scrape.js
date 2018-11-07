const puppeteer = require('puppeteer');
const moment = require('moment');
const fs = require('fs');
const yaml = require('js-yaml');
const util = require('./util.js');

// config
const allSitesDir = 'sites';
const tileSize = {
  x: 0,
  y: 0, 
  width: 600,
  height: 600
};

const sizes = {
  // '0360x0': {width: 360,  height: 0},
  '0600x0': {width: 600, height: 0},
  // '0640x0': {width: 640,  height: 0},
  // '0768x0': {width: 768,  height: 0},
  // '1000x0': {width: 1000, height: 0},
  // '1024x0': {width: 1024, height: 0},
  '1200x0': {width: 1200, height: 0},
  // '1280x0': {width: 1280, height: 0},
  // '1500x0': {width: 1500, height: 0},
  // '1920x0': {width: 1920, height: 0},
  // '1080x0': {width: 1080, height: 0},
};

const sites = [
  // {
  //   slug: 'harvard',
  //   url: 'https://library.harvard.edu'
  // },
  // {
  //   slug: 'stanford',
  //   url: 'https://library.stanford.edu'
  // },
  // {
  //   slug: 'uic',
  //   url: 'https://library.uic.edu'
  // },
  // {
  //   slug: 'uiuc',
  //   url: 'https://library.illinois.edu'
  // },
  // {
  //   slug: 'umich',
  //   url: 'https://www.lib.umich.edu/'
  // },
  {
    slug: 'umich_search',
    url: 'https://search.lib.umich.edu/everything'
  },
]

async function main() {
  const date = moment().utc();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  for (const s of sites) {
    const siteDir = `${allSitesDir}/${s.slug}`;
    const mdFile = `${siteDir}/md.yaml`;
    const currentDir = `${siteDir}/${date.format('YYYY-MM-DD-HHMM')}`;
    let metadata;

    // create directory if it doesn't exist
    if (!fs.existsSync(currentDir)){
      util.mkDirByPathSync(currentDir);
    }

    // initialize metadata
    if (fs.existsSync(mdFile)) {
      // input from file
      await fs.readFile(mdFile, 'utf8', async function(err, contents) {
        if(err) { console.log(err); }
        metadata = yaml.safeLoad(contents);
      });
    } else {
      // create from scratch
      metadata = {
        slug: s.slug,
        url: s.url,
        created: date.format(),
        screenshots: []
      };
    }

    // load page
    await page.goto(s.url, {
      waitUntil: 'networkidle0',
      timeout: 3000 // a little buffer in case of SPA, but not too long
    });

    // load predetermined sizes, and take screenshot
    for (let k in sizes) {
      const path = `${currentDir}/${k}.png`;
      await page.setViewport(sizes[k]);
      // take screenshot
      await page.screenshot({
        path: path,
        fullPage: true
      });
      // record metadata about screenshot
      metadata.screenshots.push({
        filename: path,
        accessed: date.format()
      })
    }
    
    // output metadata
    await fs.writeFile(mdFile, yaml.safeDump(metadata), function(err) {
      if(err) { console.log(err); }
    });

    // create square tile for general web display
    // TODO: refactor to crop from another screenshot?
    // TODO: should not happen on every run
    await page.setViewport({
      width: tileSize.width,
      height: tileSize.height
    });
    await page.screenshot({
      path: `${siteDir}/tile.png`,
      fullPage: false
    });
  }

  await browser.close();
};

main();