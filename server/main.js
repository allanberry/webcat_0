const datastore = require("nedb-promise");
const { ApolloServer, gql } = require("apollo-server");

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
    _id: ID,
    url: String,
    date: String,
    dateScraped: String,
  }

  type Query {
    colleges: [College]
    libraries: [Library]
    pages: [Page]
    visits: [Visit]
  }
`;

const resolvers = {
  Query: {
    colleges: async () => {
      // return await DB.find({url: { $regex: /mit\.edu/}});
      return await colleges.find({}, (err, docs) => {
        console.error(err);
      });
    },
    libraries: async () => {
      // return await DB.find({url: { $regex: /mit\.edu/}});
      return await libraries.find({}, (err, docs) => {
        console.error(err);
      });
    },
    pages: async () => {
      // return await DB.find({url: { $regex: /mit\.edu/}});
      return await pages.find({}, (err, docs) => {
        console.error(err);
      });
    },
    visits: async () => {
      // return await DB.find({url: { $regex: /mit\.edu/}});
      return await visits.find({}, (err, docs) => {
        console.error(err);
      });
    }
  }
};

// // The GraphQL schema
// const typeDefs = gql`
//   type Query {
//     "A simple type for getting started!"
//     hello: String
//   }
// `;

// // A map of functions which return data for the schema.
// const resolvers = {
//   Query: {
//     hello: async () => 'world'
//   }
// };

const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
