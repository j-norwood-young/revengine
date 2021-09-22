import Moment from 'moment';
import { extendMoment } from 'moment-range';
const moment = extendMoment(Moment);
const JXPHelper = require("jxp-helper");
const apihelper = new JXPHelper({
    apikey,
    server: apiserver
})

const state = {
    loading_state: "pre", // pre, loading, loaded
    quick_date_range_value: {
        label: "Last 7 Days",
    },
    quick_date_range_options: [
        {
            label: "Yesterday",
            fn: () => [moment().subtract(1, "day").startOf("day"), moment().subtract(1, "day").endOf("day")],
        },
        {
            label: "Today",
            fn: () => [moment().startOf("day"), moment().endOf("day")],
        },
        {
            label: "Last 7 Days",
            fn: () => [moment().subtract(7, "day").startOf("day"), moment().subtract(1, "day").endOf("day")],
        },
        {
            label: "This Week",
            fn: () => [moment().startOf("week"), moment()],
        },
        {
            label: "Last 15 Days",
            fn: () => [moment().subtract(15, "day").startOf("day"), moment().subtract(1, "day").endOf("day")],
        },
        {
            label: "Last 30 Days",
            fn: () => [moment().subtract(30, "day").startOf("day"), moment().subtract(1, "day").endOf("day")],
        },
        {
            label: "This Month",
            fn: () => [moment().startOf("month"), moment()],
        },
        {
            label: "Last Month",
            fn: () => [moment().subtract(1, "month").startOf("month"), moment().subtract(1, "month").endOf("month")],
        },
    ],
    date_range: [moment().subtract(7, "day").startOf("day").toDate(), moment().subtract(1, "day").endOf("day").toDate()],
    section_options: [],
    sections: [],
    articles: [],
    per_page: 20,
    journalist_options: [],
    journalists: [],
}
const getters = {
    
}
const actions = {
    async init({ commit, dispatch, state }) {
        // Get sections
        const section_options = (await apihelper.aggregate("article", [
            {
                $project: {
                    a: "$sections"
                }
            },
            {
                $unwind: "$a",
            },
            { 
                $group: { _id: "$a"}
            }
        ])).data.map(section => section._id).sort();
        commit("SET_KEYVAL", { key: "section_options", value: section_options });

        // Get journalists
        const journalist_options = (await apihelper.aggregate("article", [
            {
                $project: {
                    a: "$author"
                }
            },
            {
                $unwind: "$a",
            },
            { 
                $group: { _id: "$a"}
            }
        ])).data.map(journalist => journalist._id);
        journalist_options.sort()
        commit("SET_KEYVAL", { key: "journalist_options", value: journalist_options });
        // Get initial articles
        await dispatch("getArticles");
        // Set as loaded
        commit("SET_LOADING_STATE", "loaded")
    },
    updateQuickDateRange ({ commit, dispatch }, value) {
        commit('SET_KEYVAL', { key: "quick_date_range_value",  value })
        const date_range = value.fn().map(mt => mt.toDate());
        dispatch("updateDateRange", date_range);
    },
    updateDateRange ({ commit, dispatch }, value) {
        commit('SET_KEYVAL', { key: "date_range",  value })
        dispatch("getArticles");
    },
    updateSections ({ commit, dispatch }, value) {
        commit('SET_KEYVAL', { key: "sections",  value })
        dispatch("getArticles")
    },
    updateJournalists ({ commit, dispatch }, value) {
        commit('SET_KEYVAL', { key: "journalists",  value })
        dispatch("getArticles")
    },
    async getArticles({ state, commit }) {
        commit("SET_LOADING_STATE", "loading")
        const match = {
            "hits.date": {
                $gte: state.date_range[0].toISOString(),
                $lte: state.date_range[1].toISOString(),
            }
        }
        if (state.sections.length) {
            match.sections = {
                "$in": state.sections
            }
        }
        if (state.journalists.length) {
            match.author = {
                "$in": state.journalists
            }
        }
        const articles = (await apihelper.aggregate("article", [
            {
                $match: match
            },
            {
                $unwind: {
                    path: "$hits",
                }
            },
            {
                $project: {
                    hits_count: "$hits.count",
                    hits_date: "$hits.date",
                    title: 1,
                    tags: 1,
                    sections: 1,
                    post_id: 1,
                    urlid: 1,
                    author: 1,
                    date_published: 1,
                    logged_in_hits: 1,
                    readers_led_to_subscription: 1
                }
            },
            {
                $match: {
                    hits_date: {
                        $gte: state.date_range[0].toISOString(),
                        $lte: state.date_range[1].toISOString(),
                    },
                    hits_count: { $gt: 0 },
                }
            },
            {
                $group: {
                    _id: "$_id",
                    hits: { $sum: "$hits_count" },
                    "doc":{"$first":"$$ROOT"},
                }
            },
            {
                $sort: {
                    hits: -1
                }
            },
            {
                $limit: 100
            },
            {
                $project: {
                    title: "$doc.title",
                    tags: "$doc.tags",
                    sections: "$doc.sections",
                    post_id: "$doc.post_id",
                    urlid: "$doc.urlid",
                    author: "$doc.author",
                    date_published: "$doc.date_published",
                    logged_in_hits: "$doc.logged_in_hits",
                    readers_led_to_subscription: "$doc.readers_led_to_subscription",
                    hits: 1,
                }
            }
        ]))
        .data.map(article => {
            article.date_published_formatted = moment(article.date_published).format("YYYY-MM-DD HH:mm");
            article.logged_in_hits_total = article.logged_in_hits.filter(hit => moment().range(state.date_range).contains(moment(hit.date))).reduce((prev, curr) => prev + curr.count, 0);
            article.led_to_subscription_count = article.readers_led_to_subscription ? article.readers_led_to_subscription.length : 0;
            return article;
        });
        commit("SET_KEYVAL", { key: "articles", value: articles })
        commit("SET_LOADING_STATE", "loaded")
    }
}
const mutations = {
    SET_KEYVAL (state, keyval) {
        state[keyval.key] = keyval.value
    },
    SET_LOADING_STATE(state, loading_state) {
        state.loading_state = loading_state;
    },
}

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}