require("dotenv").config();
const fs = require("fs");
const datastore = require("nedb-promise");
const auth = require("./google/auth");
const { google } = require("googleapis");
const setupLogger = require("./utils.js").setupLogger

// The google spreadsheet to download.
const spreadsheetId = "1hqFgqqKbNZwBvB63IzwnbkaKApF4jblnvjTjpxIXu40";

// These tabs in the Google spreadsheet will be downloaded.
const tabs = ["colleges", "libraries", "pages"];

// setup logger
const logger = setupLogger('download');

// Load client secrets from a local file.
const credentials = `${__dirname}/google/credentials.json`;
fs.readFile(credentials, (err, content) => {
  if (err) return console.log("Error loading client secret file:", err);

  const parsedContent = JSON.parse(content);

  // Get sensitive Google keys from ENV
  parsedContent.installed.client_id = process.env.GOOGLE_CLIENT_ID;
  parsedContent.installed.client_secret = process.env.GOOGLE_CLIENT_SECRET;

  // Authorize a client with credentials, then call the Google Sheets API.
  auth.authorize(parsedContent, getFromGoogle);
});

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1hqFgqqKbNZwBvB63IzwnbkaKApF4jblnvjTjpxIXu40/edit#gid=0
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function getFromGoogle(auth) {
  // setup
  const sheets = google.sheets({ version: "v4", auth });

  // cycle through tabs
  tabs.forEach(sheet => {
    sheets.spreadsheets.values.get(
      {
        spreadsheetId,
        range: `${sheet}!A1:Z`
      },
      (err, res) => {
        if (err) return logger.error(`Download: The API returned an error: ${err}`);

        // clean slate
        // check if local copy exists, and if so, delete it
        const filename = `data/collected/${sheet}.db`;
        if (fs.existsSync(filename)) {
          fs.unlink(filename, err => {
            if (err) {
              logger.error(err);
            }
          });
        }

        // setup local database
        const db = datastore({
          filename,
          autoload: true
        });

        // get data from spreadsheet
        const rows = res.data.values;
        if (rows.length) {
          const cols = rows[0];
          db.insert(
            // convert row arrays to object
            rows.slice(1).map(row => {
              let obj = {};
              cols.forEach((col, index) => {
                if (row[index]) {
                  obj[col] = row[index];

                  // deal with Google booleans
                  if (obj[col] == "TRUE") {
                    obj[col] = true;
                  } else if (obj[col] == "FALSE") {
                    obj[col] = false;
                  }
                }
              });
              return obj;
            }),
            err => {
              if (err) {
                logger.error(`Download: ${err}`);
              }
            }
          );
        } else {
          logger.warn("Download: No data found.");
        }

        logger.info(`${sheet} downloaded`);
      }
    );
  });
}
