var required = function(){ throw new Error("Implement!"); };
var ScraperInterface = {
    url: required,
    title: required,
    date: required
};

module.exports = {
  ScraperInterface
}