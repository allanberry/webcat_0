import Vue from "vue";
import Vuex from "vuex";
import request from "superagent";

Vue.use(Vuex);

// import cart from './modules/cart'
// import products from './modules/products'

export default new Vuex.Store({
  state: {
    college: {},
    colleges: [],
    library: {},
    libraries: [],
    page: {},
    pages: [],
    visit: {},
    visits: []
  },
  mutations: {
    setColleges(state, payload) {
      state.colleges = payload;
    },
    setLibraries(state, payload) {
      state.libraries = payload;
    },
    setPages(state, payload) {
      state.pages = payload;
    },
    setVisits(state, payload) {
      state.visits = payload;
    }
  },
  actions: {
    async setColleges(context) {
      try {
        const qs = `{
          colleges {
            _id
            ipeds_id
            name
            url
            city
            state
          }
        }`;
        const data = await request
          .get("http://localhost:4000/graphql")
          .query({ query: qs });

        context.commit("setColleges", JSON.parse(data.text).data.colleges);
      } catch (error) {
        console.error(error);
      }
    },
    async setLibraries(context) {
      try {
        const qs = `{
          libraries {
            _id
            college_id
            arl_id
            name
            url
            arl_name
          }
        }`;
        const data = await request
          .get("http://localhost:4000/graphql")
          .query({ query: qs });

        context.commit("setLibraries", JSON.parse(data.text).data.libraries);
      } catch (error) {
        console.error(error);
      }
    },
    async setPages(context) {
      try {
        const qs = `{
          pages {
            _id
            library_id
            url
            name
          }
        }`;
        const data = await request
          .get("http://localhost:4000/graphql")
          .query({ query: qs });

        context.commit("setPages", JSON.parse(data.text).data.pages);
      } catch (error) {
        console.error(error);
      }
    },
    async setVisits(context) {
      try {
        const url = "https://lib.utah.edu/";
        const qs = `{
          visits(url: "${url}") {
            _id
            url
            date
            dateScraped
          }
        }`;
        const data = await request
          .get("http://localhost:4000/graphql")
          .query({ query: qs });

        context.commit("setVisits", JSON.parse(data.text).data.visits);
      } catch (error) {
        console.error(error);
      }
    },
    
  }
});
