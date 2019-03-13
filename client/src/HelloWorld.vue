<template>
  <p>{{ greeting }} World!</p>
</template>

<script>
module.exports = {
  name: "HelloWorld",
  data: function() {
    return {
      greeting: "Hello"
    };
  }
};
</script>

<style scoped>
p {
  font-size: 2em;
  text-align: center;
  color: green;
}
</style>