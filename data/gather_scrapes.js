require('dotenv').config()
const fs = require('fs');
const auth = require('./auth');
const {google} = require('googleapis');

// const moment = require("moment");
// const axios = require("axios");
// const colors = require("colors/safe");
// const cheerio = require("cheerio");

// const env = 

// const config = {
//   googleDoc: "data",
//   googleKey: env.GOOGLE_KEY,
//   startDate: "1995-01-01",
//   visitFrequency: 'year',
// };

// /**
//  * Runs the script.
//  */
// (async function main() {
//   try {

//     // parse colleges
//     const libraries = [
//       {
//         college_name: 'asdf',
//         college_url: 'asdf',
//         city: 'asdf',
//         state: 'asdf',
//         library_name: 'asdf',
//         library_url: 'asdf',
//         college_ipeds_id: 'asdf',
//         arl_name: 'asdf',
//         arl_id: 'asdf',
//       }
//     ]

//     // scrape sites
//     for (const lib of libraries) {
//       // convert dates to a more useful format
//       // const dates = site.dates
//       //   ? site.dates.map(date => moment.utc(date))
//       //   : config.defaultDates.map(date => moment.utc(date));

//       // once for each date
//       // for (
//       //   const date = moment.utc(config.startDate);
//       //   date.diff(moment(), "days") <= 0;
//       //   date.add(6, "months")
//       // ) {
//       //   await scrape(browser, college, date);
//       //   // console.log(d);
//       // }

//       // finish by scraping current site
//       // await scrape(browser, site, moment.utc());

//       console.log(lib.college_name)

//     }

//   } catch (error) {
//     console.error(error);
//   }

//   console.log(env)
// })();





// Load client secrets from a local file.
fs.readFile(`${__dirname}/credentials.json`, (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);

  const parsedContent = JSON.parse(content);

  // Get sensitive Google keys from ENV
  parsedContent.installed.client_id = process.env.GOOGLE_CLIENT_ID
  parsedContent.installed.client_secret = process.env.GOOGLE_CLIENT_SECRET

  // Authorize a client with credentials, then call the Google Sheets API.
  auth.authorize(parsedContent, listMajors);
});


/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1hqFgqqKbNZwBvB63IzwnbkaKApF4jblnvjTjpxIXu40/edit#gid=0
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function listMajors(auth) {
  const sheets = google.sheets({version: 'v4', auth});
  sheets.spreadsheets.values.get({
    spreadsheetId: '1hqFgqqKbNZwBvB63IzwnbkaKApF4jblnvjTjpxIXu40',
    range: 'libraries!B72:J101',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const rows = res.data.values;
    if (rows.length) {
      console.log('Name, Major:');
      // Print columns A and E, which correspond to indices 0 and 4.
      rows.map((row) => {
        console.log(`${row[0]}, ${row[4]}`);
      });
    } else {
      console.log('No data found.');
    }
  });
}