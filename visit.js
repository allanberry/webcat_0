const request = require("superagent");
const fs = require("fs");
const moment = require("moment");
const csvParse = require("csv-parse/lib/sync");
const colors = require("colors");
const puppeteer = require("puppeteer");
const rm = require("rimraf");

const startDate = "2017-01-01";

// main
(async () => {
  try {
    // setup
    const browser = await puppeteer.launch();

    // parse libraries
    const librariesCSV = await fs.promises.readFile(
      "data/libraries.csv",
      "utf8"
    );
    const libraries = csvParse(librariesCSV, {
      columns: true,
      skip_empty_lines: true
    });

    // iterate libraries
    for (const library of libraries) {
      // iterate dates
      let date = moment.utc(startDate);
      while (date.isBefore(moment())) {
        // scrape
        await scrapeWayback(browser, library, date);
        date = date.add(1, "years");
      }
    }

    // cleanup
    await browser.close();
  } catch (error) {
    console.error(error);
  }
})();

async function scrapeWayback(browser, library, dateInput) {
  const wbFormat = "YYYYMMDDHHmmss";
  let dir;
  let date;

  try {
    const r = await request.get(
      `https://archive.org/wayback/available?url=${
        library.url
      }/&timestamp=${dateInput.format(wbFormat)}`
    );
    date = moment.utc(
      r.body.archived_snapshots.closest.timestamp,
      wbFormat
    );
    const waybackUrl = `http://web.archive.org/web/${date.format(wbFormat)}/${
      library.url
    }`;
    const waybackUrlRaw = `http://web.archive.org/web/${date.format(
      wbFormat
    )}id_/${library.url}`;

    const raw = await request.get(waybackUrlRaw);

    let output = JSON.stringify({
      slug: library.slug,
      urlSite: library.url,
      waybackUrl,
      waybackUrlRaw,
      dateWayback: date.format(),
      dateRetrieved: moment.utc().format(),
      responseContentType: raw["Content-Type"],
      responseEncoding: raw.encoding
      // responseBody: raw.text
    });

    // output
    dir = `data/scrapes/${library.slug}/${date.format(wbFormat)}`;

    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(`${dir}/md.json`, output);
      await fs.promises.writeFile(`${dir}/index.html`, raw.text);

      // screenshots
      const viewports = {
        "0600x0": {
          width: 600,
          height: 0,
          isMobile: true,
          isLandscape: false
        },
        "1200x0": {
          width: 1200,
          height: 0,
          isMobile: false,
          isLandscape: true
        }
      };
      for (const v in viewports) {
        const page = await browser.newPage();
        await page.goto(waybackUrl, {
          waitUntil: "networkidle0",
          // timeout: 100000
        });
        await page.evaluate(() => {
          let dom = document.querySelector("#wm-ipp");
          dom.parentNode.removeChild(dom);
        });
        await page.setViewport(viewports[v]);
        await page.screenshot({
          path: `${dir}/${v}.png`,
          fullPage: true
        });
        await page.close();
      }

      // report
      console.log(
        `${colors.green("OK:")} ${date.format(wbFormat)} ${library.slug}`
      );
    } else {
      console.log(
        `${colors.yellow("exists:")} ${date.format(wbFormat)} ${
          library.slug
        }`
      );
    }
  } catch (error) {
    console.log(
      `${colors.red("NOPE:")} ${date.format(wbFormat)} ${
        library.slug
      } (${colors.red(error.name)})`
      // error
    );
    // clean up bad directories
    if (dir && fs.existsSync(dir)) {
      rm.sync(dir);
    }
  }

  // const result = await axios.get(library.url);
  // console.log(result.data)
}
