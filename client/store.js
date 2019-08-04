import Vue from "vue";
import Vuex from "vuex";
import request from "superagent";

Vue.use(Vuex);

// import cart from './modules/cart'
// import products from './modules/products'

export default new Vuex.Store({
  state: {
    colleges: [],
    libraries: []
  },
  mutations: {
    setColleges(state, payload) {
      state.colleges = payload;
    },
    setLibraries(state, payload) {
      state.libraries = payload;
    }
  },
  getters:{
    college(state) {
      return id => state.colleges.find(item => {
        return item["_id"] === id
      });
    },
    library(state) {
      return id => state.libraries.find(item => {
        return item["_id"] === id
      });
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
    }
  }
});
