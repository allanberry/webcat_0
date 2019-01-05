const Koa = require("koa");
const Logger = require('koa-logger')
const BodyParser = require("koa-bodyparser");
const Helmet = require('koa-helmet')
const Router = require('koa-router');

const app = new Koa();
const config = require("dotenv").config();

const router = new Router();
require('./routes')({ router });

const port = 3000;


// config
if (process.env.NODE_ENV === "development") {
  app.use(Logger())
}


// plugins
app.use(Helmet())
app.use(
  BodyParser({
    enableTypes: ["json"],
    jsonLimit: "5mb",
    strict: true,
    onerror: function(err, ctx) {
      ctx.throw("body parse error", 422);
    }
  })
);


app.use(router.routes());
app.use(router.allowedMethods());


// run
const server = app.listen(port);
module.exports = server;
console.log(`App listening on port ${port}`);