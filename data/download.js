require("dotenv").config();
const fs = require("fs");
const auth = require("./google/auth");
const { google } = require("googleapis");

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
function getFromGoogle(auth) {
  const sheets = google.sheets({ version: "v4", auth });

  ['colleges', 'libraries', 'pages'].forEach(sheet => {
    sheets.spreadsheets.values.get(
      {
        spreadsheetId: "1hqFgqqKbNZwBvB63IzwnbkaKApF4jblnvjTjpxIXu40",
        range: `${sheet}!A1:Z`
      },
      (err, res) => {
        if (err) return console.log("The API returned an error: " + err);
        const rows = res.data.values;
        if (rows.length) {
          const cols = rows[0];
          console.log(rows.slice(1).map(row => {
            let obj = {};
            cols.forEach((col, index) => {
              if (row[index]) {
                obj[col] = row[index];
              }
            })
            return(obj);
          }));
          console.log('\n\n\n\n\n\n\n');
        } else {
          console.log("No data found.");
        }
      }
    )
  })


  
}
