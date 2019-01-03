const clientDir = `${__dirname}/client`;

module.exports = {
  lintOnSave: false,
  configureWebpack: {

    /*
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
  },

  /*
    * Change 'public' dir to 'client/public'
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

  /*
   * Change 'dist' dir to 'client/dist'
   * https://github.com/vuejs/vue-cli/issues/1496#issuecomment-410546250
   */
  outputDir: `${clientDir}/_dist`,
};
