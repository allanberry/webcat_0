<template>
  <div id="site-header">
    <h1><router-link :to="{ name: 'home' }">Webcat</router-link></h1>
    <nav>
      <ul>
        <li><router-link :to="{ name: 'libraries'}">Libraries</router-link></li>
        <li><router-link :to="{ name: 'library', params: {slug: 'mit'}}">Library: MIT</router-link></li>
      </ul>
    </nav>
  </div>
</template>

<script>
export default {
  name: "site-header"
};
</script>

<style scoped lang="scss">
#site-header {
  background-color: #222;
  color: white;
  padding-top: .5rem;
  padding-bottom: .5rem;
}
</style>
