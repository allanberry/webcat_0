from __future__ import print_function
from googleapiclient import discovery
from httplib2 import Http
from oauth2client import file, client, tools
from pprint import pprint
from requests import requests

# If modifying these scopes, delete the file token.json.
SCOPES = "https://www.googleapis.com/auth/spreadsheets"

# The ID and range of a sample spreadsheet.
SPREADSHEET_ID = "1hqFgqqKbNZwBvB63IzwnbkaKApF4jblnvjTjpxIXu40"


def lists_to_dicts(lists):
    output = []

    if not lists:
        print("No data found.")
    else:
        names = []
        for i, row in enumerate(lists):
            # first name is column names
            if i is 0:
                names = row
            else:
                d = {}
                for j, col in enumerate(row):
                    d[names[j]] = col
                output.append(d)
    return output


def download_libraries(service):
    return lists_to_dicts(
        (
            service.spreadsheets()
            .values()
            .get(spreadsheetId=SPREADSHEET_ID, range="libraries!A:Z")
            .execute()
            .get("values", [])
        )
    )


def upload_visit(service, visit):
    value_range_body = {
        "values": [
            [
                visit["id"],
                visit["library"],
                visit["url"],
                visit["wayback"],
                visit["date_retrieved"],
                visit["date_archived"],
                visit["source"],
            ]
        ],
        "majorDimension": "ROWS",
        "range": "visits!A2:Z",
    }

    request = (
        service.spreadsheets()
        .values()
        .append(
            spreadsheetId=SPREADSHEET_ID,
            range="visits!A2:Z",
            valueInputOption="USER_ENTERED",
            body=value_range_body,
        )
    )

    response = request.execute()

    # # TODO: Change code below to process the `response` dict:
    # return response


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

    service = discovery.build("sheets", "v4", http=creds.authorize(Http()))

    # Call the Sheets API
    libraries = download_libraries(service)

    visit = {
        "id": "asdf",
        "library": "asdf",
        "url": "asdf",
        "wayback": "asdf",
        "date_retrieved": "asdf",
        "date_archived": "asdf",
        "source": "asdf",
    }

    upload_visit(service, visit)


if __name__ == "__main__":
    main()


#

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
