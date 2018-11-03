const puppeteer = require('puppeteer');
const sizes = {
  '0360': {width: 360,  height: 0},
  '0640': {width: 640,  height: 0},
  '0768': {width: 768,  height: 0},
  '1024': {width: 1024, height: 0},
  '1280': {width: 1280, height: 0},
  '1920': {width: 1920, height: 0},
  '1080': {width: 1080, height: 0},
};

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://library.uic.edu');

  for (var k in sizes) {
    await page.setViewport(sizes[k]);
    await page.screenshot({path: `scrapes/uic/uic-${k}.png`, fullPage: true});
  }


  await browser.close();
})();