<template>
  <div id="site-library">
    <h2>{{ library.name }}</h2>
    <p>(current) <a v-bind:href="library.url">website</a></p>

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
import request from "superagent";

export default {
  name: "site-library",
  data: function() {
    return {
      library: {}
    };
  },
  async mounted() {
    this.library = await this.getData();
  },
  methods: {
    getData: async function() {
      try {
        const qs = `{
          library(_id: "${this.$route.params.slug}") {
            _id
            name
            url
            college_id
            arl_id
            arl_name
          }
        }`;
        const data = await request
          .get("http://localhost:4000/graphql")
          .query({ query: qs });

        return JSON.parse(data.text).data.library;
      } catch (error) {
        console.error(error);
      }
    }
  }
};
</script>

<style scoped lang="scss">
#site-content {
}
</style>
