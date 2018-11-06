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
  const date = moment().utc();
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  for (const s of sites) {
    const currentDate = date.format('YYYY-MM-DD');
    const siteDir = `${allSitesDir}/${s.slug}`;
    const currentDir = `${siteDir}/${currentDate}`;
    let screenshots = [];

    // make sure directory exists, and if not, create it
    if (!fs.existsSync(currentDir)){
      util.mkDirByPathSync(currentDir);
    }

    // load page
    await page.goto(s.url, {
      waitUntil: 'networkidle0',
      timeout: 3000 // a little buffer in case of SPA, but not too long
    });

    // load predetermined sizes, and take screenshot
    for (let k in sizes) {
      const filename = `${s.slug}-${k}.png`;
      path = `${currentDir}/${filename}`;
      await page.setViewport(sizes[k]);
      await page.screenshot({
        path: path,
        fullPage: true
      });
      screenshots.push({
        filename: filename,
        accessed: date.format()
      })
    }

    // create square tile for general web display
    // TODO: refactor to crop from another screenshot?
    await page.setViewport({
      width: tileSize.width,
      height: tileSize.height
    });
    await page.screenshot({
      path: `${currentDir}/${s.slug}-tile.png`,
      fullPage: false
    });
    
    // output metadata
    const mdFile = `${siteDir}/md.yaml`;
    if (fs.existsSync(mdFile)) {
      await fs.readFile(mdFile, 'utf8', async function(err, contents) {
        if(err) { console.log(err); }
        // unserialize and add latest data
        let metadata = yaml.safeLoad(contents);
        metadata.screenshots = metadata.screenshots.concat(screenshots);

        // serialize
        const y = yaml.safeDump(metadata);
        await fs.writeFile(mdFile, y, function(err) {
          if(err) { console.log(err); }
        });
      });
    } else {
      // serialize and save
      const y = yaml.safeDump({
        slug: s.slug,
        url: s.url,
        created: date.format(),
        screenshots: screenshots
      });
      await fs.writeFile(mdFile, y, function(err) {
        if(err) { console.log(err); }
      });
    }
  }

  await browser.close();
};

main();