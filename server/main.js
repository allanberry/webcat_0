const datastore = require("nedb-promise");
const { ApolloServer, gql } = require("apollo-server");
const GraphQLJSON = require('graphql-type-json');


// setup database
const colleges = new datastore({
  filename: "data/collected/colleges.db",
  autoload: true
});
const libraries = new datastore({
  filename: "data/collected/libraries.db",
  autoload: true
});
const pages = new datastore({
  filename: "data/collected/pages.db",
  autoload: true
});
const visits = new datastore({
  filename: "data/collected/visits.db",
  autoload: true
});

// schema
const typeDefs = gql`
  type College {
    _id: ID
    ipeds_id: String
    name: String
    url: String
    city: String
    state: String
  }

  type Library {
    _id: ID
    college_id: String
    arl_id: String
    name: String
    url: String
    arl_name: String
  }

  type Page {
    _id: ID
    library_id: String
    url: String
    name: String
  }

  type Visit {
    _id: ID
    slug: String
    url: String
    date: String
    dateScraped: String
    rendered: Rendered
  }

  type Rendered {
    url: String
    title: String
    screenshots: [Screenshot]
  }

  type Screenshot {
    name: String
  }

  type Query {
    college(_id: ID!): College
    colleges: [College]
    library(_id: ID!): Library
    libraries: [Library]
    page(_id: ID!): Page
    pages(library_id: String!): [Page]
    visit(_id: ID!): Visit
    visits(url: String!): [Visit]

  }
`;

const resolvers = {
  Query: {
    college: async (obj, args, context, info) => {
      return await colleges.findOne({ _id: args._id }, (err, docs) => {
        console.error(err);
      });
    },
    colleges: async () => {
      return await colleges.find({}, (err, docs) => {
        console.error(err);
      });
    },
    library: async (obj, args, context, info) => {
      return await libraries.findOne({ _id: args._id }, (err, docs) => {
        console.error(err);
      });
    },
    libraries: async () => {
      return await libraries.find({}, (err, docs) => {
        console.error(err);
      });
    },
    page: async (obj, args, context, info) => {
      return await pages.findOne({ _id: args._id }, (err, docs) => {
        console.error(err);
      });
    },
    pages: async (obj, args, context, info) => {
      return await pages.find({ library_id: args.library_id }, (err, docs) => {
        console.error(err);
      });
    },
    visit: async (obj, args, context, info) => {
      return await visits.findOne({ _id: args._id }, (err, docs) => {
        console.error(err);
      });
    },
    visits: async (obj, args, context, info) => {
      return await visits.find({ url: args.url }, (err, docs) => {
        console.error(err);
      });
    },
  },
};

const server = new ApolloServer({
  cors: {
    origin: '*',
    credentials: true // <-- REQUIRED backend setting
  },
  typeDefs,
  resolvers
});

server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
