const cached_keys = {}
const state = {
    loading_state: "loading",
    _id: user_id,
    name: "",
    email: "",   
}

const JXPHelper = require("jxp-helper");
const apihelper = new JXPHelper({
    apikey,
    server: apiserver
})

const getters = {}

const actions = {
    async init({ commit, dispatch, state }) {
        const user = (await apihelper.getOne("user", user_id)).data;
        commit("SET_KEYVAL", { key: "name", value: user.name });
        commit("SET_KEYVAL", { key: "email", value: user.email });
        commit("SET_LOADING_STATE", "loaded")
    }
}

const mutations = {
    SET_KEYVAL (state, keyval) {
        state[keyval.key] = keyval.value;
        const cached_keys_keys = Object.keys(cached_keys);
        if (cached_keys_keys.includes(keyval.key)) localStorage.setItem(`${localstorage_prepend}${keyval.key}`, JSON.stringify(keyval.value))
    },
    SET_LOADING_STATE(state, loading_state) {
        state.loading_state = loading_state;
    },
}

const plugins = []

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations,
    plugins
}