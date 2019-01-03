const CopyWebpackPlugin = require('copy-webpack-plugin')
const clientDir = `${__dirname}/client`;
const outputDir = `${clientDir}/_dist`;

module.exports = {
  lintOnSave: false,
  configureWebpack: {

    /**
      * Change 'src' dir to 'client'
      * https://github.com/vuejs/vue-cli/issues/1134
      */
    resolve: {
      alias: {
        '@': clientDir
      }
    },
    entry: {
      app: `${clientDir}/main.js`
    },

    plugins: [
      new CopyWebpackPlugin([
        /**
          * Ignore 'public' dir, but copy 'client/public' instead
          */
        {
          from: `${clientDir}/public`,
          to: outputDir
        }
      ], {})
    ],
  },

  /**
    * Move 'index.html' to client dir
    * https://stackoverflow.com/a/49437325/652626
    */
  chainWebpack: config => {
    config
      .plugin('html')
      .tap(args => {
        args[0].template = `${clientDir}/public/index.html`
        return args
      })
  },

  /**
    * Change 'dist' dir to 'client/dist'
    * https://github.com/vuejs/vue-cli/issues/1496#issuecomment-410546250
    */
  outputDir: outputDir
};
