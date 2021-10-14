import Moment from 'moment';
import { extendMoment } from 'moment-range';
import router from "../../router";
const ss = require("simple-statistics");
import createCache from 'vuex-cache';
import isNumber from 'lodash.isnumber';

const localstorage_prepend = "RevEngine-ContentReport-"
const moment = extendMoment(Moment);
const JXPHelper = require("jxp-helper");
const apihelper = new JXPHelper({
    apikey,
    server: apiserver
})

const plugins = [createCache()]

const cached_keys = {
    "visible_fields": val => val,
    "sort_field": val => val,
    "article_fields": vals => {
        const result = [];
        for (let val of vals) {
            val.fn = article_fields.find(article_field => article_field.field === val.field).fn;
            result.push(val)
        }
        return result;
    }
}

const article_fields = [
    {
        title: "Hits",
        field: "hits",
        fn: i => Number(i).toLocaleString(),
        weight: 1
    },
    {
        title: "Newsletter Clicks",
        field: "newsletter_hits_total",
        fn: i => Number(i).toLocaleString(),
        weight: 1
    },
    {
        title: "Logged In Hits",
        field: "logged_in_hits_total",
        fn: i => Number(i).toLocaleString(),
        weight: 2
    },
    {
        title: "Led to Subscription",
        field: "led_to_subscription_count",
        fn: i => Number(i).toLocaleString(),
        weight: 3
    },
    {
        title: "Avg Secs Engaged",
        field: "avg_secs_engaged",
        fn: i => Number(i).toLocaleString() + "s",
        weight: 2
    },
    {
        title: "Score",
        field: "score",
        fn: i => Number(Math.round(i * 10000) / 100).toLocaleString(),
        isScore: true
    }
];

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
    sort_field: "score",
    sort_dir: -1,
    article_fields,
    show_dashboard_settings: false,
    visible_fields: ["Hits", "Score"]
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
        const query = Object.assign({}, router.history.current.query);

        // Load localStorage values
        const cached_keys_keys = Object.keys(cached_keys);
        for (let key of cached_keys_keys) {
            const json = localStorage.getItem(`${localstorage_prepend}${key}`)
            if (!json) continue;
            try {
                const value = cached_keys[key](JSON.parse(json));
                commit("SET_KEYVAL", { key, value });
            } catch(err) {
                console.error(err);
            }
        }

        // If any options are set in the querystring, use those
        if (query.sections) {
            if (!Array.isArray(query.sections)) query.sections = [query.sections];
            commit("SET_KEYVAL", { key: "sections", value: query.sections })
        }
        if (query.journalists) {
            if (!Array.isArray(query.journalists)) query.journalists = [query.journalists];
            commit("SET_KEYVAL", { key: "journalists", value: query.journalists })
        }
        if (query.tags) {
            if (!Array.isArray(query.tags)) query.tags = [query.tags];
            commit("SET_KEYVAL", { key: "tags", value: query.tags })
        }

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
        const query = Object.assign({}, router.history.current.query);
        query.sections = value;
        router.push({ query })
        dispatch("getArticles")
    },
    updateJournalists ({ commit, dispatch }, value) {
        commit('SET_KEYVAL', { key: "journalists",  value })
        const query = Object.assign({}, router.history.current.query);
        query.journalists = value;
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
    addJournalist({ state, dispatch }, value) {
        const journalists = [ ...state.journalists, value ];
        dispatch("updateJournalists", journalists)
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
                    avg_secs_engaged: 1,
                    engagement_rate: 1,
                    returning_readers: 1,
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
        .data.map(article => {
            article.date_published_formatted = moment(article.date_published).format("ddd D MMMM YYYY, h:mma");
            article.logged_in_hits_total = article.logged_in_hits.filter(hit => moment().range(state.date_range).contains(moment(hit.date))).reduce((prev, curr) => prev + curr.count, 0);
            article.led_to_subscription_count = article.readers_led_to_subscription ? article.readers_led_to_subscription.length : 0;
            article.newsletter_hits_total = article.newsletter_hits ? article.newsletter_hits.reduce((prev, curr) => prev + curr.count, 0) : 0;
            return article;
        });
        const spreads = {};
        for (let field of article_fields) {
            spreads[field.field] = articles.map(article => article[field.field]).sort((a, b) => a - b);
        }
        // Assign quantiles
        articles = articles.map(article => {
            for (let field of article_fields) {
                if (article[field.field]) {
                    article[field.field + "_rank"] = ss.quantileRankSorted(spreads[field.field], article[field.field])
                }
            }
            return article;
        })
        // Calculate score
        const score_weights_sum = state.article_fields.map(field => field.weight).filter(weight => (weight)).reduce((prev, curr) => prev + curr, 0);
        articles = articles.map(article => {
            let tot = 0;
            for (let field of article_fields) {
                if (field.weight) {
                    if (article[field.field + "_rank"])
                        tot += article[field.field + "_rank"] * field.weight
                }
            }
            article.score = tot / score_weights_sum;
            return article;
        })
        // Sort
        articles.sort((a, b) => a[state.sort_field] > b[state.sort_field] ? 1 * state.sort_dir : -1 * state.sort_dir)
        // Just get top 100
        articles = articles.slice(0, 100)
        // Get total hits
        let total_hits = (await apihelper.aggregate("article", [
            {
                $match: {
                    urlid: {
                        $in: articles.map(article => article.urlid)
                    }
                },
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
                }
            },
            {
                $group: {
                    _id: "$_id",
                    total_hits: { $sum: "$hits_count" },
                    "doc":{"$first":"$$ROOT"},
                }
            },
            {
                $replaceRoot: { 
                    newRoot: { 
                        $mergeObjects: [ 
                            { total_hits: "$total_hits" }, "$doc" 
                        ] 
                    } 
                }
            },
        ])).data;
        for (let article of articles) {
            article.total_hits = total_hits.find(hit => hit._id === article._id).total_hits
        }
        commit("SET_KEYVAL", { key: "articles", value: articles })
        commit("SET_LOADING_STATE", "loaded")
    },
    showDashboardSettings({ state, commit }) {
        commit("SET_KEYVAL", { key: "show_dashboard_settings", value: true })
    },
    hideDashboardSettings({ dispatch, commit }) {
        commit("SET_KEYVAL", { key: "show_dashboard_settings", value: false })
    },
    applyDashboardSettings({ dispatch, commit }) {
        commit("SET_KEYVAL", { key: "show_dashboard_settings", value: false })
        dispatch("getArticles");
    },
    updateVisibleFields({ state, commit }, value) {
        commit('SET_KEYVAL', { key: "visible_fields",  value })
    },
    updateFieldWeight({ state, commit }, data) {
        const fields = state.article_fields;
        const i = fields.findIndex(field => field.field === data.field)
        fields[i].weight = Number(data.value);
        commit('SET_KEYVAL', { key: "article_fields",  value: fields })
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

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations,
    plugins
}