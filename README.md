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

At this point you should have a functioning codebase.  Please let me know if anything is amiss.


## Get some data

This project doesn't really come with any data; you will need to grab some from the Wayback Machine.  This will get you a few:

```bash
$ npm run visit -- -u https://lib.asu.edu/ -s 1995-01-01 -i "6 months"
$ npm run visit -- -u http://asu.edu/lib/ -s 1995-01-01 -i "6 months"
$ npm run visit -- -u https://www.lib.auburn.edu/ -s 1995-01-01 -i "6 months"
$ npm run visit -- -u https://library.bc.edu/ -s 1995-01-01 -i "6 months"
$ npm run visit -- -u http://www.bu.edu/library/ -s 1995-01-01 -i "6 months"
$ npm run visit -- -u https://lib.byu.edu/ -s 1995-01-01 -i "6 months"
$ npm run visit -- -u https://library.brown.edu/ -s 1995-01-01 -i "6 months"
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