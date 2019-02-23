const request = require("superagent");
const fs = require("fs");
const moment = require("moment");
const csvParse = require("csv-parse/lib/sync");
const colors = require("colors");
const puppeteer = require("puppeteer");
// const rm = require("rimraf");
const startDate = "1995-01-01";


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

  let date;

  try {
    const r = await request.get(
      `https://archive.org/wayback/available?url=${
        library.url
      }/&timestamp=${dateInput.format(wbFormat)}`
    );
    date = moment.utc(r.body.archived_snapshots.closest.timestamp, wbFormat);
    const waybackUrl = `http://web.archive.org/web/${date.format(wbFormat)}/${
      library.url
    }`;
    const waybackRawUrl = `http://web.archive.org/web/${date.format(
      wbFormat
    )}id_/${library.url}`;

    const waybackRaw = await request.get(waybackRawUrl);

    let output = {
      slug: library.slug,
      site: library.url,
      date: dateInput.format(),
      dateRetrieved: moment.utc().format(),

      // for data from puppeteer, for the most part
      rendered: {
        url: waybackUrl,
        page: {},
        browser: {}
      },

      // for raw HTML, from Superagent
      raw: {
        url: waybackRawUrl,
        response: {
          status: waybackRaw.status,
          type: waybackRaw.type,
          headers: waybackRaw.header, 
        }
      }
    };

    // filesystem
    const metaDir = `data/scrapes/meta`;
    const pagesDir = `data/scrapes/pages`;
    const screensDir = `data/scrapes/screens`;
    await fs.promises.mkdir(metaDir, { recursive: true });
    await fs.promises.mkdir(pagesDir, { recursive: true });
    await fs.promises.mkdir(screensDir, { recursive: true });

    // puppeteer
    try {
      const viewports = {
        // "0001x0001": {
        //   width: 1,
        //   height: 1,
        //   // isMobile: false,
        //   isLandscape: false
        // },
        "0600": {
          width: 600,
          height: 1
          // isMobile: true,
          // isLandscape: false
        },
        "1200": {
          width: 1200,
          height: 1
          // isMobile: false,
          // isLandscape: true
        }
      };

      // scraping
      for (const v in viewports) {
        const page = await browser.newPage();

        // Navigate to page
        await page.goto(waybackUrl, {
          waitUntil: "networkidle0"
          // timeout: 100000
        });

        // strip wayback div
        await page.evaluate(() => {
          let waybackDiv = document.querySelector("#wm-ipp");
          waybackDiv.parentNode.removeChild(waybackDiv);
        });
        await page.setViewport(viewports[v]);

        // screenshots
        const screenFile = `${screensDir}/${library.slug}-${date.format(wbFormat)}-${v}.png`;
        if (!fs.existsSync(screenFile)) {
          await page.screenshot({
            path: screenFile,
            fullPage: true,
            omitBackground: true,
          });
          console.log(
            `${colors.green("scrn OK")}: ${library.slug}-${date.format(
              wbFormat
            )}-${v}.png`)
        } else {
          console.log(
            `${colors.yellow("scrn --")}: ${library.slug}-${date.format(
              wbFormat
            )}-${v}.png`
          );
        }

        // collect extra puppeteer metadata
        output.rendered.page.metrics = await page.metrics();
        output.rendered.page.title = await page.title()
        // output.wayback.page.accessibility = await page.accessibility.snapshot();
        output.rendered.browser.userAgent = await browser.userAgent();
        output.rendered.browser.version = await browser.version();

        // cleanup
        await page.close();
      }
      // );
    } catch (error) {
      console.log(
        // `${colors.red("NOPE   ")}: ${date.format(wbFormat)} ${
        //   library.slug
        // } (${colors.red(error.name)})`
        error
      );
    }

    // output metadata
    const mdFile = `${metaDir}/${library.slug}-${date.format(wbFormat)}.json`;
    if (!fs.existsSync(mdFile)) {
      await fs.promises.writeFile(mdFile, JSON.stringify(output));
      console.log(
        `${colors.green("meta OK")}: ${library.slug}-${date.format(
          wbFormat
        )}.json`
      );
    } else {
      console.log(
        `${colors.yellow("meta --")}: ${library.slug}-${date.format(
          wbFormat
        )}.json`
      );
    }

    // output raw html
    const pageFile = `${pagesDir}/${library.slug}-${date.format(wbFormat)}.html`;
    if (!fs.existsSync(pageFile)) {
      await fs.promises.writeFile(pageFile, waybackRaw.text);
      console.log(
        `${colors.green("page OK")}: ${library.slug}-${date.format(
          wbFormat
        )}.html`
      );
    } else {
      console.log(
        `${colors.yellow("page --")}: ${library.slug}-${date.format(
          wbFormat
        )}.html`
      );
    }


  } catch (error) {
    console.error(error);
  }
  // const result = await axios.get(library.url);
  // console.log(result.data)
}
