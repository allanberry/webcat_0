const datastore = require("nedb-promise");
const { ApolloServer, gql } = require("apollo-server");

// setup database
const DB = new datastore({ filename: "data/nedb.db", autoload: true });

// schema
const typeDefs = gql`
  type Visit {
    _id: ID
    url: String
    date: String
    slug: String
  }

  type Query {
    visits: [Visit]
  }
`;

const resolvers = {
  Query: {
    visits: async () => {
      return await DB.find({});
    }
  }
};

const server = new ApolloServer({ typeDefs, resolvers });

server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
