import requests
import dataset
import arrow
import csv
import asyncio
import os
import pyppeteer


# config
initial_date = '2018-01-01'

# setup db
db = dataset.connect("sqlite:///data/webcat.db")

async def get_screenshots(site, date_short):

    defaultSizes = {
        "0600x0": {"width": 600, "height": 0},
        "1200x0": {"width": 1200, "height": 0}}

    # make sure path exists
    screenshot_path = f'data/screenshots/{site["slug"]}/{date_short}/'
    os.makedirs(screenshot_path, exist_ok=True)

    for key, value in defaultSizes.items():

        print(key, value)

        # # setup
        # browser = await pyppeteer.launch(
        #     autoClose=False
        # )
        # page = await browser.newPage()
        # url = f'https://web.archive.org/web/{date_short}/{site["url"]}'
        # await page.goto(url, {
        #     'waitUntil': 'networkidle0'
        # })

        # # remove wayback crap
        # await page.evaluate('''() => {
        #     let dom = document.querySelector('#wm-ipp');
        #     dom.parentNode.removeChild(dom);
        # }''')

        # # take screenshot
        # await page.setViewport(value)
        # await page.screenshot({
        #     'path': f'{screenshot_path}/{key}.png',
        #     'fullPage': True
        # })

        # # cleanup
        # await page.close()
        # await browser.close()



# async def scrape_wayback(browser, site, date_input):
async def scrape_wayback(site, date_input):
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
            'url_site': site['url'],
            'url_wayback': wayback_url,
            'response_content_type': r.headers['content-type'],
            'response_encoding': r.encoding,
            'response_text_utf8': r.text,
            'date_wayback': date.to('utc').isoformat(), 
            'date_retrieved': arrow.now().isoformat()
        })

        # get screenshot
        await get_screenshots(site, date_wb)

        # report to screen
        print(f'OK: {site["slug"]} {date_short}')
    
    else:
        print(f'--: {site["slug"]} {date_short} (exists)')


async def main():

    # setup site
    with open("data/libraries.csv") as libraries_csv:
        reader = csv.reader(libraries_csv)

        cols = next(reader)
        for row in reader:
            # setup date
            date = arrow.get(initial_date)

            # setup site
            site = {}
            for col_index, col in enumerate(row):
                col_name = cols[col_index]
                site[col_name] = col
            
            # iterate sites/dates
            while date <= arrow.utcnow():
                await scrape_wayback(site, date)
                date = date.shift(years=+1)


if __name__ == "__main__":
    asyncio.run(main())
