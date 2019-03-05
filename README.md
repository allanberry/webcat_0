---
title: Website Catalog
date: 2019-01-19
---

# Website Catalog

This is a catalog of websites.


# Gathering data from a single url

$ npm run visit -- -u http://example.com -s 1995-01-01 -i "6 months"

-u: url
-s: start date
-e: end date
-i: increments


## Todo

- write it up
- handle redirects
  e.g. http://web.archive.org/web/20120103055748/http://asu.edu/lib/
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
  - generating engines
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