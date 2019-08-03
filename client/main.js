import "babel-polyfill";
import 'es6-promise/auto'

import Vue from "vue";
import Vuex from 'vuex'
import VueRouter from "vue-router";
import App from "./components/App.vue";
import router from "./router.js";
import store from './store.js';

new Vue({
  el: "#app",
  router,
  store,
  render: h => h(App)
});

