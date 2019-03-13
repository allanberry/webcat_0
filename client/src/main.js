// import Vue from "vue";
// import wrap from "@vue/web-component-wrapper";
// import HelloWorld from "../components/HelloWorld.vue";

// const CustomElement = wrap(Vue, HelloWorld);

// window.customElements.define("hello-world", CustomElement);

import Vue from 'vue';
import App from './App.vue';

new Vue({
  el: '#app',
  render: h => h(App)
});