<template>
  <div id="site-library">
    <h2>Massachusetts Institute of Technology Libraries</h2>
    <p>{{ $route.params.slug }}</p>

    <h3>Dates collected</h3>
    <ul>
      <li>2000-01-01</li>
      <li>2005-01-01</li>
      <li>2010-01-01</li>
      <li>2015-01-01</li>
    </ul>

  </div>
</template>

<script>
export default {
  name: "site-library", 
  
};
</script>

<style scoped lang="scss">
#site-content {
}
</style>
