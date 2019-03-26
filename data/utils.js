const log4js = require("log4js");

module.exports = {
  /**
   * A logger to track script progress.
   */
  setupLogger: function(logName) {
    // logger
    const logger = log4js.getLogger();
    logger.level = "debug";
    log4js.configure({
      appenders: {
        out: { type: "stdout" },
        app: { type: "file", filename: `log/${logName}.log` }
      },
      categories: {
        default: { appenders: ["out", "app"], level: "debug" }
      }
    });
    return logger;
  }
}

