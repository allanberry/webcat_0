const Koa = require("koa");
const cors = require('@koa/cors');
const { ApolloServer, gql } = require("apollo-server-koa");

// Construct a schema, using GraphQL schema language
const typeDefs = gql`
  type Query {
    hello: String
  }
`;

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    hello: () => "Hello world!"
  }
};

const server = new ApolloServer({ typeDefs, resolvers });
const app = new Koa();
app.use(cors());

server.applyMiddleware({ app });

// browser response
app.use(async ctx => {
  ctx.body = "Hello Blarm";
});

app.listen({ port: 3000 }, () =>
  console.log(`🚀 Server ready at http://localhost:3000`)
);
