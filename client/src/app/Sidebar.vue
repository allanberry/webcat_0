<template>
  <div id="site-sidebar">
    <h2>Sidebar</h2>
    <div class="input-group">
      <select class="custom-select" id="inputGroupSelect01">
        <option selected>Choose Library...</option>
        <option value="1">MIT</option>
        <option value="2">Stanford</option>
        <option value="3">UIC</option>
      </select>
    </div>
  </div>
</template>

<script>
export default {
  name: "site-sidebar"
};
</script>

<style scoped lang="scss">
#site-sidebar {
}
</style>
