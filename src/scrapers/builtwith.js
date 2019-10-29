async function getBuiltWith(url) {
  // https://api.builtwith.com/v13/api.json?KEY=f857bd0a-cc11-43fa-bdec-112308e8ba1e&LOOKUP=lib.asu.edu
  // const response = await request.get("ipv4bot.whatismyipaddress.com");
  // const ip = response.text;

  // const query = { url };
  // const api = "https://api.builtwith.com/v13/api.json";

  // const inDatabase = (await builtwith_db.count(query)) > 0;

  // if (overwrite || !inDatabase) {
  //   const full_url = `${api}?KEY=${
  //     process.env.BUILTWITH_API_KEY
  //   }&LOOKUP=${encodeURIComponent(url)}`;

  //   const response = await request.get(full_url);
  //   const data = Object.assign(query, {
  //     api,
  //     accessed: moment.utc().format(),
  //     data: JSON.parse(response.text)
  //   });

  //   // save for later, to reduce API calls
  //   await builtwith_db.update(query, data, {
  //     upsert: true
  //   });
  //   return data;
  // } else {
  //   return await builtwith_db.findOne(query);
  // }
}

module.exports = {};