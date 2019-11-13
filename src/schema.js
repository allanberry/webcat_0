
export default {
  page: {
    library_id: "",
    name: "",
    url: "",
    slug: "",
    date: "",
    library: {},
    college: {},
  },

  library: {
    _id: "",
    college_id: "",
    ipeds_id: "",
    url: "",
    name: "",
    arl_id: "",
    arl_name: "",
    type: ""
  },

  college: {
    _id: "",
    ipeds_id: "",
    name: "",
    url: "",
    city: "",
    state: ""
  },

  scrape: {
    url: "",
    title: "",
    accessed: "",
    htmlattrs: {},
    client: {},
    raw: {
      agent: {},
      accessed: "",
      text: "",
    },
    rendered: {
      agent: {},
      accessed: "",
      text: "",
    },
    specifics: {
      metaElements: [element],
      imageElements: [element],
      iframeElements: [element],
      links: [],
      menus: [],
      forms: [],
      searchers: [],
      sections: [],
      blocks: [],
      bento: false,
      advancedSearch: false,
      chat: false,
    },
    cssDocs: [],
    jsDocs: [],
    screenshots: [],
    builtwith: {},
    lighthouse: {},
    computed: {
      complexity: () => {},
      whiteSpace: () => {},
    }
  },

  block: {
    name: "",
    element: element,
    cssSelector: "",
    coordinates: []
  },

  client: {
    ip: "",
    geo: "",
    browser: {
      userAgent: "",
      version: ""
    },
    os: ""
  },

  agent: {
    name: "",
    url: "",
    version: "",
  },

  element: {
    name: "",
    tag: "",
    attrs: ""
  },

  link: {
    tag: "",
    text: "",
    attrs: ""
  },

  menu: {
    title: "",
    tags: ["",""],
    link: {},
    items: [],
  },

  form: {
    title: "",
    labelText: "",
    attrs: "",
    options: ["","",""],
    items: []
  },

  searcher: {
    title: "",
    tags: ["",""],
    forms: [],
  },

  cssDocument: {
    url: "",
    accessed: "",
    text: "",
  },

  jsDocument: {
    url: "",
    accessed: "",
    text: "",
  },

  screenshot: {
    url: "",
    accessed: "",
    path: "",
  },

  builtwith: {
    url: "",
    api: "",
    accessed: "",
    data: {
      Results: [],
      Errors: []
    }
  },

  lighthouse: {
    url: "",
    api: "",
    accessed: "",
    data: {}
  }
}