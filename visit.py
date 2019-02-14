import requests
import dataset
import arrow
import csv
import asyncio
from pyppeteer import launch


# config
initial_date = '1995-01-01'

# setup db
db = dataset.connect("sqlite:///data/webcat.db")


def scrape_wayback(site, date_input):
    # get correct date
    wb_format = "YYYYMMDDHHmmss"
    date_wanted = date_input.format(wb_format)
    date = arrow.get(
        requests.get(
            f'http://archive.org/wayback/available?url={site["url"]}&timestamp={date_wanted}'
        ).json()["archived_snapshots"]["closest"]["timestamp"],
        wb_format,
    )
    date_short = date.format('YYYY-MM-DD')

    # see if scrape already exists in db
    table = db['scrapes']
    exists = table.find_one(date_scrape=date.to('utc').isoformat())

    if not exists:
        date_wb = date.format(wb_format)
        wayback_url = f'http://web.archive.org/web/{date_wb}id_/{site["url"]}'

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
        print(f'OK: {site["slug"]} {date_short}')
    
    else:
        print(f'--: {site["slug"]} {date_short} (exists)')


async def main():
    # setup site

    # with open("data/libraries.csv") as libraries_csv:
    #     reader = csv.reader(libraries_csv)

    #     # setup date
    #     date = arrow.get(initial_date)

    #     cols = next(reader)
    #     for row in reader:
    #         site = {}
    #         for index, col in enumerate(row):
    #             site[cols[index]] = col
            
    #         while date <= arrow.utcnow():
    #             scrape_wayback(site, date)
    #             date = date.shift(years=+1)

    browser = await launch()
    page = await browser.newPage()

    url = 'https://web.archive.org/web/20090720015749/http://library.uic.edu/'
    await page.goto(url)
        # wait_until('networkidle0')

    defaultSizes = {
            "0600x0": {"width": 600, "height": 0},
            "1200x0": {"width": 1200, "height": 0}}

    await page.setViewport({"width": 200, "height": 0})


    await page.evaluate('''() => {
            let dom = document.querySelector('#wm-ipp');
            dom.parentNode.removeChild(dom);
        }''')


    await page.screenshot({'path': 'data/screenshots/example.png'})
    await browser.close()
            
            



if __name__ == "__main__":
    asyncio.run(main())
