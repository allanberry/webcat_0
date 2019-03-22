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
  auth.authorize(parsedContent, listMajors);
});

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1hqFgqqKbNZwBvB63IzwnbkaKApF4jblnvjTjpxIXu40/edit#gid=0
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function listMajors(auth) {
  const sheets = google.sheets({ version: "v4", auth });
  sheets.spreadsheets.values.get(
    {
      spreadsheetId: "1hqFgqqKbNZwBvB63IzwnbkaKApF4jblnvjTjpxIXu40",
      range: "libraries!B72:J101"
    },
    (err, res) => {
      if (err) return console.log("The API returned an error: " + err);
      const rows = res.data.values;
      if (rows.length) {
        console.log("Name, Major:");
        // Print columns A and E, which correspond to indices 0 and 4.
        rows.map(row => {
          console.log(`${row[0]}, ${row[4]}`);
        });
      } else {
        console.log("No data found.");
      }
    }
  );
}
