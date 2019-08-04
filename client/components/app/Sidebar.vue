<template>
  <div id="site-sidebar">
    <multiselect
      track-by="_id"
      label="name"
      @select="dispatch"
      :options="colleges"
    ></multiselect>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import Multiselect from "vue-multiselect";

export default {
  name: "site-sidebar",
  data: function() {
    return {
    };
  },
  computed: {
    colleges() {
      return this.$store.state.colleges
    }
  },
  components: {
    Multiselect
  },
  methods: {
    dispatch(library) {
      this.$router.push({ name: 'library', params: { slug: library._id } })
    }
  }
};
</script>

<style scoped lang="scss">
@import "vue-multiselect/dist/vue-multiselect.min.css";

#site-sidebar {
}
</style>
