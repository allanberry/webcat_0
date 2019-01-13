from __future__ import print_function
from googleapiclient.discovery import build
from httplib2 import Http
from oauth2client import file, client, tools

# If modifying these scopes, delete the file token.json.
SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly"

# The ID and range of a sample spreadsheet.
SPREADSHEET_ID = '1hqFgqqKbNZwBvB63IzwnbkaKApF4jblnvjTjpxIXu40'
RANGE_NAME = "libraries!A2:J101"


def main():
    """Shows basic usage of the Sheets API.
    Prints values from a sample spreadsheet.
    """
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    store = file.Storage("token.json")
    creds = store.get()
    if not creds or creds.invalid:
        flow = client.flow_from_clientsecrets("credentials.json", SCOPES)
        creds = tools.run_flow(flow, store)
    service = build("sheets", "v4", http=creds.authorize(Http()))

    # Call the Sheets API
    sheet = service.spreadsheets()
    result = (
        sheet.values()
        .get(spreadsheetId=SPREADSHEET_ID, range=RANGE_NAME)
        .execute()
    )
    values = result.get("values", [])

    if not values:
        print("No data found.")
    else:
        print("Name, Major:")
        for row in values:
            # Print columns A and E, which correspond to indices 0 and 4.
            print("%s, %s" % (row[0], row[4]))


if __name__ == "__main__":
    main()

# """
# BEFORE RUNNING:
# ---------------
# 1. If not already done, enable the Google Sheets API
#    and check the quota for your project at
#    https://console.developers.google.com/apis/api/sheets
# 2. Install the Python client library for Google APIs by running
#    `pip install --upgrade google-api-python-client`
# """
# from pprint import pprint

# from googleapiclient import discovery

# # TODO: Change placeholder below to generate authentication credentials. See
# # https://developers.google.com/sheets/quickstart/python#step_3_set_up_the_sample
# #
# # Authorize using one of the following scopes:
# #     'https://www.googleapis.com/auth/drive'
# #     'https://www.googleapis.com/auth/drive.file'
# #     'https://www.googleapis.com/auth/spreadsheets'
# credentials = None

# service = discovery.build('sheets', 'v4', credentials=credentials)

# # The ID of the spreadsheet to update.
# spreadsheet_id = '1hqFgqqKbNZwBvB63IzwnbkaKApF4jblnvjTjpxIXu40'

# # The A1 notation of the values to update.
# range_ = 'visits!A2:G2'

# # How the input data should be interpreted.
# value_input_option = 'USER_ENTERED'

# value_range_body = {
#   "values": [
#     [
#       "id",
#       "library",
#       "url",
#       "wayback",
#       "date_retrieved",
#       "date_archived",
#       "source"
#     ]
#   ],
#   "majorDimension": "ROWS",
#   "range": "visits!A2:G2"
# }

# request = service.spreadsheets().values().update(spreadsheetId=spreadsheet_id, range=range_, valueInputOption=value_input_option, body=value_range_body)
# response = request.execute()

# # TODO: Change code below to process the `response` dict:
# pprint(response)
