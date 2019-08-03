import Vue from "vue";
import VueRouter from "vue-router";
import Home from "./components/routes/Home.vue";
import Libraries from "./components/routes/Libraries.vue";
import Library from "./components/routes/Library.vue";
import Error404 from "./components/routes/Error404.vue";

Vue.use(VueRouter);

const routes = [
  { path: "/", name: "home", component: Home },
  { path: "/libraries", name: "libraries", component: Libraries },
  { path: "/libraries/:slug", name: "library", component: Library },
  { path: "*", component: Error404 }
];

export default new VueRouter({
  mode: "history",
  routes
});
