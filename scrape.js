const puppeteer = require('puppeteer');
const fs = require('fs');
const imagesDir = 'images';
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
  {
    slug: 'harvard',
    url: 'https://library.harvard.edu'
  },
  {
    slug: 'stanford',
    url: 'https://library.stanford.edu'
  },
  {
    slug: 'uic',
    url: 'https://library.uic.edu'
  },
  {
    slug: 'uiuc',
    url: 'https://library.illinois.edu'
  },
  {
    slug: 'umich',
    url: 'https://www.lib.umich.edu/'
  },
]

async function main() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  for (const s of sites) {

    // make sure directory exists, and if not, create it
    const dir = `${imagesDir}/${s.slug}`;
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
    }

    // load page
    await page.goto(s.url);


    // load predetermined sizes, and take screenshot
    for (let k in sizes) {
      await page.setViewport(sizes[k]);
      await page.screenshot({
        path: `${imagesDir}/${s.slug}/${s.slug}-${k}.png`,
        fullPage: true
      });
    }

    // create square tile for general web display
    await page.setViewport({
      width: tileSize.width,
      height: tileSize.height
    });
    await page.screenshot({
      path: `${imagesDir}/${s.slug}/${s.slug}-tile.png`,
      fullPage: false
    });
  }

  await browser.close();
};

main();