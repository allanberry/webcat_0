import "babel-polyfill";
import Vue from "vue";
import VueRouter from "vue-router";
import App from "./components/App.vue";
import routes from "./routes.js";

Vue.use(VueRouter);

const router = new VueRouter({
  mode: "history",
  routes
});

new Vue({
  el: "#app",
  router,
  render: h => h(App)
});
