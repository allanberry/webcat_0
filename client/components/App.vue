<template>
  <div id="app" class="container">
    <header class="row">
      <site-header class="col"></site-header>
    </header>
    <main id="main-content" class="row">
      <div class="col-sm-4">
        <site-sidebar></site-sidebar>
      </div>
      <div class="col-sm-8">
        <site-content></site-content>
      </div>
    </main>
    <footer class="row">
      <site-footer class="col"></site-footer>
    </footer>
  </div>
</template>

<script>
import SiteHeader from "./app/Header.vue";
import SiteSidebar from "./app/Sidebar.vue";
import SiteContent from "./app/Content.vue";
import SiteFooter from "./app/Footer.vue";

export default {
  name: "app",
  data() {
    return {};
  },
  components: {
    SiteHeader,
    SiteSidebar,
    SiteContent,
    SiteFooter
  }
};
</script>

<style lang="scss">
#app {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  main#main-content {
    flex: 1;
    background-color: #ddd
  }
}
</style>