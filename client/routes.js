import Home from "./components/routes/Home.vue";
import Libraries from "./components/routes/Libraries.vue";
import Library from "./components/routes/Library.vue";
import Error404 from './components/routes/Error404.vue';

export default [
  { path: "/", name: "home", component: Home },
  { path: "/libraries", name: "libraries", component: Libraries },
  { path: "/libraries/:slug", name: "library", component: Library },
  { path: '*', component: Error404 }
];