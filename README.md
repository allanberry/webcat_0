---
title: Website Catalog
date: 2019-01-19
---

# Website Catalog

This is a catalog of websites.

## important for understanding setup:

- https://alligator.io/vuejs/vue-parceljs/
- https://www.apollographql.com/docs/apollo-server/servers/koa.html


## install

For this setup, I assume you're on a Mac, as I am most of the time.  Otherwise, YMMV.  You will need to install:

- Homebrew
- Node.js and NPM
- Git

[This Digital Ocean guide](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-and-create-a-local-development-environment-on-macos) looks like a nice tutorial to install Homebrew and Node.

To install Git, this command should do it:

```bash
$ brew install git
```

[This guide](https://www.digitalocean.com/community/tutorials/how-to-contribute-to-open-source-getting-started-with-git) will help you to setup Git.

Move to a directory where you want to put this project, clone the directory from GitHub, and install everything:

```bash
$ cd ~/Documents  # or wherever
$ git clone https://github.com/allanberry/webcat.git
$ npm install
```

Now, you will need to [setup the Google Sheets API](https://developers.google.com/sheets/api/quickstart/python), so the downloader can access a Google spreadsheet which contains the requisite college data.




At this point you should have a functioning codebase.  Please let me know if anything is amiss.


## Get some data

This project doesn't really come with any data; you will need to grab some from the Wayback Machine.  This will get you a few:

```bash
$ npm run visit -- --url https://lib.asu.edu/ --startDate 1995-01-01 --increment "6 months"
$ npm run visit -- --url http://asu.edu/lib/ --startDate 1995-01-01 --increment "6 months"
$ npm run visit -- --url https://www.lib.auburn.edu/ --startDate 1995-01-01 --increment "6 months"
$ npm run visit -- --url https://library.bc.edu/ --startDate 1995-01-01 --increment "6 months"
$ npm run visit -- --url http://www.bu.edu/library/ --startDate 1995-01-01 --increment "6 months"
$ npm run visit -- --url https://lib.byu.edu/ --startDate 1995-01-01 --increment "6 months"
$ npm run visit -- --url https://library.brown.edu/ --startDate 1995-01-01 --increment "6 months"
```


## GraphQL server:


You can start a live local dev environment (GraphQL server, live client) thus:

```bash
$ npm run dev
```

This will return data from what you have collected:

```bash
$ http :4000/graphql query:='"{ colleges { name, url } }"'
```


## Gathering data from a single url

```bash
$ npm run visit -- -u http://example.com -s 1995-01-01 -i "6 months"
```

-u: url
-s: start date
-e: end date
-i: increments


## Todo

- carry overwrite logic to screenshots
- write it up
- draft wireframes for basic page types
  - home page
  - gallery view
    - frames
    - aggregate visualizations, tables
    - filters
  - library/college view
    - focused visualizations
    - access to raw data
  - page view
- page white space calculate?
- make Google Sheets optional
  - freeze a set of sheets into repository
  - if Sheets API not active, fallback to frozen sheets
- collect current webpages as well
  - optional if redundant?
- run data collection logic on a schedule?
- use puppeteer to determine coordinates of elements: https://gist.github.com/emmiep/cd35de612412ac6a283613a438e6acfa
  - form elements
  - nav/.nav/#nav/.navbar etc. elements
- handle redirects
  e.g. http://web.archive.org/web/20120103055748/http://asu.edu/lib/
- handle missing stylesheets
  e.g. http://web.archive.org/web/20171225143342/http://library.case.edu/ksl/
- clean anchors to rm wb cruft, when it makes sense
  - aggregate anchors:
    - same primary domain
    - external domains: different primary domain
    - other domains in arl list
    - repeating anchors?
- if page exists (via wb available), don't perform further requests
- what did I do with my federal data?
- additional pages
  - contact page
  - about page
  - collections page
  - hours page
  - example topic page
  - example collection page
- additional rendered data
- additional raw data
  - features (same as in rendered): slice total site bytes, and quantify
  - tags
    - doctype
    - open graph
    - meta
    - anchor
    - link
    - script
    - viewport
    - linked data (json-ld)
    - img
    - svg
    - object
    - iframe
  - attributes
    - typeof (linked data)
  - top level IDs?
  - particular roles?
  - links
  - search engines
  - generating engines, e.g. Drupal, WordPress, etc.
    - use builtwith api?
  - social media
    - links
    - agents
  - tools
    - jquery
    - js libraries
    - google analytics
  - navigation lists
  - complexity metric
  - linked files
  - carbon footprint
  - mobile optimized
  - total sizes (bytes)
    - page
    - scripts
    - styles
  - hosts
  - servers


## Links for future perusal, use

(h/t Tracy Seneca, via email, 2019-08-01)
- https://web.archive.org/web/20010413160217/http://sunsite.berkeley.edu/Libweb/
- https://web.archive.org/web/19991023010617/http://sunsite.berkeley.edu/


## Subroutines

inputs
  url, or list of URLs
  date, or list of dates
  overwrite
  current


1. invoke
  1. authorize
  1. download data
  1. orchestrate
    1. gather
    1. postprocess

1. orchestrate
  1. determine steps to perform (steps user intends to perform)
    1. determine whether data already exists
    1. determine whether date/url exists in Wayback
      1. adjust date
      1. record
  1. perform steps (list of urls, list of dates)

1. gather
  1. get
    - raw, using superagent (url)
      1. prepare
        - log versions, etc.
        - retrieve data
      1. scrape
        - html analysis
          - count characters
          - gather menus
    - rendered, using puppeteer (url)
      1. prepare
        - log versions, etc.
        - retrieve data
        - remove wayback elements if necessary
      1. scrape
        - screenshots
          - formal analysis
          - color analysis
        - css
          - gather colors
          - count rules
        - javascript
          - count characters
        - links
          - gather anchors
    - builtwith (url)
      1. prepare
        - log versions, etc.
        - retrieve data
      1. scrape
    - lighthouse (url)
      1. prepare
        - log versions, etc.
        - retrieve data
      1. scrape
  1. save (output dict)

1. postprocess
  1. create derivative data
    - complexity analysis
    - text analysis
      - natural language processing


subroutines
  - html (url)
    return: html compuobject

  - css (url)
    return: css object

  - js (url)
    return: js object

  - screenshots (url or urls)
    save: images to folder
    return: screenshots object

  - links (html text)
    return: links array
targettar
  - menus (html text)
    return: menus object