import Moment from 'moment';
import { extendMoment } from 'moment-range';
import router from "../../router";
const ss = require("simple-statistics");
import createCache from 'vuex-cache';

const moment = extendMoment(Moment);
const JXPHelper = require("jxp-helper");
const apihelper = new JXPHelper({
    apikey,
    server: apiserver
})

const plugins = [createCache()]

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
    journalist_stats: [],
    tag_options: [],
    tags: [],
    per_page: 20,
    journalist_options: [],
    journalists: [],
    sort_field: "hits",
    sort_dir: -1
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
        const query = Object.assign({}, router.history.current.query);
        if (query.sections) {
            if (!Array.isArray(query.sections)) query.sections = [query.sections];
            commit("SET_KEYVAL", { key: "sections", value: query.sections })
        }
        if (query.tags) {
            if (!Array.isArray(query.tags)) query.tags = [query.tags];
            commit("SET_KEYVAL", { key: "tags", value: query.tags })
        }
        // Get initial journalist stats
        await dispatch("getJournalistStats");
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
        const query = Object.assign({}, router.history.current.query);
        query.sections = value;
        router.push({ query })
        dispatch("getArticles")
    },
    updateTags ({ commit, dispatch }, value) {
        commit('SET_KEYVAL', { key: "tags",  value })
        const query = Object.assign({}, router.history.current.query);
        query.tags = value;
        router.push({ query })
        dispatch("getArticles")
    },
    async findTags({ commit, dispatch }, value) {
        if (value.length <= 2) return;
        this.isLoading = true;
        const result = await apihelper.aggregate("article", [
            {
                $unwind: "$tags"
            },
            {
                $group: {
                    _id: "$tags"
                }
            },
            {
                $sort: {
                    "_id": 1
                }
            },
            {
                $match: {
                    "$expr": {
                        "$regexMatch": {
                           "input": "$_id",
                           "regex": value,
                           "options": "i"
                        }
                    }
                }
            }
        ])
        const tags = result.data.map(item => item._id);
        commit('SET_KEYVAL', { key: "tag_options",  value: tags });
        this.isLoading = false
    },
    addSection({ state, dispatch }, value) {
        const sections = [ ...state.sections, value ];
        dispatch("updateSections", sections)
    },
    addTag({ state, dispatch }, value) {
        const tags = [ ...state.tags, value ];
        dispatch("updateTags", tags)
    },
    updateSortField({ state, commit, dispatch}, field) {
        if (field === state.sort_field) {
            commit('SET_KEYVAL', { key: "sort_dir",  value: (state.sort_dir === 1) ? -1 : 1 });
        } else {
            commit('SET_KEYVAL', { key: "sort_field",  value: field });
        }
        dispatch("getArticles")
    },
    async getJournalistStats({ state, commit }) {
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
        if (state.tags.length) {
            match.tags = {
                "$in": state.tags
            }
        }
        const sort = {};
        sort[state.sort_field] = state.sort_dir;
        let articles = (await apihelper.aggregate("article", [
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
                    readers_led_to_subscription: 1,
                    newsletter_hits: 1,
                    img_thumbnail: 1,
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
                $limit: 1000
            },
            {
                $replaceRoot: { 
                    newRoot: { 
                        $mergeObjects: [ 
                            { hits: "$hits" }, "$doc" 
                        ] 
                    } 
                }
            },
        ]))
        .data
        .map(article => {
            article.logged_in_hits_total = article.logged_in_hits.filter(hit => moment().range(state.date_range).contains(moment(hit.date))).reduce((prev, curr) => prev + curr.count, 0);
            article.led_to_subscription_count = article.readers_led_to_subscription ? article.readers_led_to_subscription.length : 0;
            article.newsletter_hits_total = article.newsletter_hits ? article.newsletter_hits.reduce((prev, curr) => prev + curr.count, 0) : 0;
            return article;
        });
        // Group into journalists
        const journalists = [];
        for (article of articles) {
            let i = journalists.indexOf(journalist => journalist.journalist === article.author);
            if (i === -1) {
                i = journalists.push({
                    journalist: article.author,
                    logged_in_hits_total: 0,
                    led_to_subscription_count: 0,
                    newsletter_hits_total: 0,
                    hits: 0
                }) - 1;
            }
            journalists[i].logged_in_hits_total += article.logged_in_hits_total;
            journalists[i].led_to_subscription_count += article.led_to_subscription_count;
            journalists[i].newsletter_hits_total += article.newsletter_hits_total;
            journalists[i].newsletter_hits_total += article.newsletter_hits_total;
        }
        // Work out quantiles
        const hits_spread = journalists.map(article => article.hits).sort((a, b) => a - b);
        const logged_in_hits_spread = journalists.map(article => article.logged_in_hits_total).sort((a, b) => a - b);
        const led_to_subscription_spread = journalists.map(article => article.led_to_subscription_count).sort((a, b) => a - b);
        
        // Assign quantiles
        journalists = journalists.map(journalist => {
            journalist.hits_rank = ss.quantileRankSorted(hits_spread, journalist.hits);
            journalist.logged_in_hits_rank = ss.quantileRankSorted(logged_in_hits_spread, journalist.logged_in_hits_total);
            journalist.led_to_subscription_rank = ss.quantileRankSorted(led_to_subscription_spread, journalist.led_to_subscription_count);
            return journalist;
        })
        // Calculate score
        journalists = journalists.map(journalist => {
            journalist.score = (journalist.hits_rank + (journalist.logged_in_hits_rank * 2) + (journalist.led_to_subscription_rank * 3)) / 6;
            return journalist;
        })
        // Sort
        journalists.sort((a, b) => a[state.sort_field] > b[state.sort_field] ? 1 * state.sort_dir : -1 * state.sort_dir)
        // Just get top 100
        journalists = journalists.slice(0, 100)
        // Get total hits
        // let total_hits = (await apihelper.aggregate("article", [
        //     {
        //         $match: {
        //             urlid: {
        //                 $in: articles.map(article => article.urlid)
        //             }
        //         },
        //     },
        //     {
        //         $unwind: {
        //             path: "$hits",
        //         }
        //     },
        //     {
        //         $project: {
        //             hits_count: "$hits.count",
        //             hits_date: "$hits.date",
        //         }
        //     },
        //     {
        //         $group: {
        //             _id: "$_id",
        //             total_hits: { $sum: "$hits_count" },
        //             "doc":{"$first":"$$ROOT"},
        //         }
        //     },
        //     {
        //         $replaceRoot: { 
        //             newRoot: { 
        //                 $mergeObjects: [ 
        //                     { total_hits: "$total_hits" }, "$doc" 
        //                 ] 
        //             } 
        //         }
        //     },
        // ])).data;
        // for (let article of articles) {
        //     article.total_hits = total_hits.find(hit => hit._id === article._id).total_hits
        // }
        commit("SET_KEYVAL", { key: "journalist_stats", value: journalists })
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
    mutations,
    plugins
}