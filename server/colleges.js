const parse = require("csv-parse");
var fs = require("fs");
const util = require("util");

// Convert fs.readFile into Promise version of same
const readFile = util.promisify(fs.readFile);

const collegesFile = `${__dirname}/../data/db/colleges.csv`;

/**
 * Get all colleges
 */
async function listColleges() {
  return await readFile(collegesFile, "utf8", function(err, contents) {
    return parse(
      contents,
      {
        columns: true,
        skip_empty_lines: true
      },
      (err, output) => {
        return output;
      }
    );
  });
}

/**
 * Show one college
 */
async function showCollege() {
  return await readFile(collegesFile, "utf8", function(err, contents) {
    return contents;
  });
}

// console.log(records);

module.exports = {
  list: async (ctx, next) => {
    // const names = Object.keys(records);
    // ctx.body = "colleges: " + names.join(", ");

    ctx.body = await listColleges();
    next();
  },

  show: async (ctx, name) => {
    console.log("show");
    // const pet = db[name];
    // if (!pet) return ctx.throw("cannot find that pet", 404);
    // ctx.body = pet.name + " is a " + pet.species;
    ctx.body = await listColleges();
  }
};
