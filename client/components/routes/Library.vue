<template>
  <div id="site-library" v-if="college && library">
    <h2>{{library.name}}</h2>

    <template v-if="pages && pages.length > 0">
      <h3>Visits</h3>
      <ul>
        <li :key="page.url" v-for="page in pages">
          <a :href="page.url">{{ page.url }}</a>

          <template v-if="page.visits && page.visits.length > 0">
            <ul v-if="page.visits && page.visits.length > 0">
              <li :key="visit._id" v-for="visit in page.visits">

                <template v-if="visit && visit.rendered && visit.rendered.screenshots && visit.rendered.screenshots.length > 0">
                    <img :key="screenshot.name" v-for="screenshot in visit.rendered.screenshots" 
                      :src="imagePath(visit, screenshot)"
                    />
                </template>
                {{ formatDate(visit.date) }}

              </li>
            </ul>
          </template>
        </li>
      </ul>
    </template>
  </div>
</template>

<script>
import request from "superagent";
import moment from "moment";

export default {
  name: "site-library",
  data() {
    return {
      pages: []
    };
  },
  methods: {
    formatDate(date_raw) {
      return moment.utc(date_raw).format("YYYY MMM D, h:mma");
    },
    imagePath(visit, screenshot) {
      return `http://159.89.221.204/iiif/2/webcat%2F${visit.slug}%2F${screenshot.name}/square/200,/0/default.png`
    }
  },
  asyncComputed: {
    college() {
      return this.$store.getters.college(this.$route.params.slug);
    },
    library() {
      return this.$store.getters.library(this.$route.params.slug);
    },
    async pages() {
      try {
        const library_id = this.$route.params.slug;
        const qs = `{
          pages(library_id: "${library_id}") {
            _id
            library_id
            url
            name
          }
        }`;
        const data = await request
          .get("http://localhost:4000/graphql")
          .query({ query: qs });
        const parsed_data = JSON.parse(data.text).data.pages;

        for (let page of parsed_data) {
          try {
            const qs = `{
              visits(url: "${page.url}") {
                # _id
                slug
                url
                date
                dateScraped
                rendered {
                  url
                  title
                  screenshots {
                    name
                  }
                }
              }
            }`;
            const visits_data = await request
              .get("http://localhost:4000/graphql")
              .query({ query: qs });

            page.visits = JSON.parse(visits_data.text).data.visits.sort(
              (a, b) => (a.date > b.date ? 1 : -1)
            );
          } catch (error) {
            console.error(error);
          }
        }

        return parsed_data;
      } catch (error) {
        console.error(error);
      }
    }
  }
};
</script>

<style scoped lang="scss">
</style>
