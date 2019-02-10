import requests
import dataset
import arrow
import csv


# setup db
db = dataset.connect('sqlite:///data/webcat.db')

# if libraries table doesn't exist, do that
if 'libraries' not in db.tables:
    table = db.create_table(
        'libraries'
    )
    with open('data/libraries.csv') as libraries_csv:
        reader = csv.reader(libraries_csv)
        cols = next(reader)
        for row in reader:
            d = {}
            for index, col in enumerate(row):
                d[cols[index]] = col
            table.insert(d)


def scrape(site, date):
    # setup wayback
    date_wayback = date.format('YYYYMMDDHHmmss')
    wayback_url = f'http://web.archive.org/web/{date_wayback}id_/{site["url"]}'

    # get site
    r = requests.get(wayback_url)

    # store it
    table = db['scrapes']

    table.insert({
        'slug': site['slug'],
        'url': site['url'],
        'url_requested': wayback_url,
        'content_type': r.headers['content-type'],
        'encoding': r.encoding,
        'text': r.text,
        'date_scrape': date.to('utc').isoformat()
    })

    # report to screen
    date_formatted = date.format('YYYY-MM-DD')
    print(f'OK: {site["slug"]} {date_formatted}')


def main():
    # setup site
    site = {
        'slug': 'mit',
        'url': 'https://libraries.mit.edu/',
    }
    
    # setup date
    date = arrow.get('1995-01-01')

    scrape(site, date)


if __name__ == "__main__":
    main()