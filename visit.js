const request = require("superagent");
const fs = require("fs");
const moment = require("moment");
const csvParse = require("csv-parse/lib/sync");
// const cheerio = require('cheerio');
const colors = require('colors');

const startDate = "2017-01-01";

// main
(async () => {
  try {
    // parse libraries
    const librariesCSV = fs.readFileSync("data/libraries.csv", "utf8");
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
        await scrapeWayback(library, date);
        date = date.add(1, "years");
      }
    }
  } catch (error) {
    console.error(error);
  }
})();

async function scrapeWayback(library, dateInput) {
  const wbFormat = "YYYYMMDDHHmmss";

  try {
    const r = await request.get(
      `https://archive.org/wayback/available?url=${
        library.url
      }/&timestamp=${dateInput.format(wbFormat)}`
    );
    const date = moment.utc(
      r.body.archived_snapshots.closest.timestamp,
      wbFormat
    );
    const waybackUrl = `http://web.archive.org/web/${date.format(wbFormat)}/${
      library.url
    }`;
    const waybackUrlRaw = `http://web.archive.org/web/${date.format(
      wbFormat
    )}id_/${library.url}`;

    const r2 = await request.get(waybackUrlRaw);

    let output = JSON.stringify({
      slug: library.slug,
      urlSite: library.url,
      waybackUrl,
      waybackUrlRaw,
      dateWayback: date.format(),
      dateRetrieved: moment.utc().format(),
      responseContentType: r2["Content-Type"],
      responseEncoding: r2.encoding,
      // responseBody: r2.text
    });

    const dir = `data/scrapes/${library.slug}/${date.format(wbFormat)}`;
    fs.mkdir(dir, { recursive: true }, err => {
      if (err) {
        console.error(err);
      }
    });
    fs.writeFileSync(`${dir}/md.json`, output);
    fs.writeFileSync(`${dir}/index.html`, r2.text);

    console.log(`${colors.green('OK:')} ${date.format('YYYY-MM-DD')} ${library.slug}`);
  } catch (error) {
    // console.log(`${colors.red('NOPE:')} ${dateInput.format('YYYY-MM-DD')} ${library.slug}`);
    console.log(error)
  }

  // const result = await axios.get(library.url);
  // console.log(result.data)
}

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if (new Date().getTime() - start > milliseconds) {
      break;
    }
  }
}
