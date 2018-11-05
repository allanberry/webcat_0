const puppeteer = require('puppeteer');
const moment = require('moment');
const fs = require('fs');
const util = require('./util.js');

// config
const sitesDir = 'sites';
const tileSize = {
  x: 0,
  y: 0, 
  width: 600,
  height: 600
};

const sizes = {
  // '0360': {width: 360,  height: 0},
  '0600': {width: 600, height: 0},
  // '0640': {width: 640,  height: 0},
  // '0768': {width: 768,  height: 0},
  // '1000': {width: 1000, height: 0},
  // '1024': {width: 1024, height: 0},
  '1200': {width: 1200, height: 0},
  // '1280': {width: 1280, height: 0},
  // '1500': {width: 1500, height: 0},
  // '1920': {width: 1920, height: 0},
  // '1080': {width: 1080, height: 0},
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
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  for (const s of sites) {
    const date = moment().utc();
    const dir = `${sitesDir}/${s.slug}/${date.format('YYYY-MM-DD')}`;

    // make sure directory exists, and if not, create it
    if (!fs.existsSync(dir)){
      util.mkDirByPathSync(dir);
    }

    // load page
    await page.goto(s.url, {
      waitUntil: 'networkidle0',
      timeout: 3000 // a little buffer in case of SPA, but not too long
    });


    // load predetermined sizes, and take screenshot
    for (let k in sizes) {
      await page.setViewport(sizes[k]);
      await page.screenshot({
        path: `${dir}/${s.slug}-${k}.png`,
        fullPage: true
      });
    }

    // create square tile for general web display
    // TODO: refactor to crop from another screenshot?
    await page.setViewport({
      width: tileSize.width,
      height: tileSize.height
    });
    await page.screenshot({
      path: `${dir}/${s.slug}-tile.png`,
      fullPage: false
    });
  }

  await browser.close();
};

main();