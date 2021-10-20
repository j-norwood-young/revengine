const cached_keys = {}
const moment = require("moment");
const state = {
    loading_state: "loading",
    reports: [],
    current_report_emails: [],
    current_report_period: "",
    current_report_time: ["08:00"],
    current_report_day: ["Monday"],
    current_report_date: ["1st"],
    period_options: [
        "daily",
        "weekly",
        "monthly",
    ],
    day_options: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
    ],
    date_options: [
        ...[...Array(28).keys()].map(n => n+1).map(n => n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th")),
        "Last",
    ],
    time_options: [...Array(23).keys()].map(n => String(n).padStart(2, "0") + ":00"),
    show_reports: false,
    report_name: "All Articles",
    current_report_name: "",
}

const JXPHelper = require("jxp-helper");
const apihelper = new JXPHelper({
    apikey,
    server: apiserver
})

const report_name_builder = (sections, journalists, tags, period) => {
    if ((!sections.length) && (!journalists.length) && (!tags.length)) {
        return `All articles for ${period.label}`
    }
    let s = `Articles for ${period.label}`
    if (sections.length) {
        if (sections.length === 1) {
            s += ` in section ${sections[0]}`
        } else {
            s += ` in sections ${sections.slice(0, sections.length - 1).join(", ")} or ${sections.slice(-1)[0]}`
        }
    }
    if (journalists.length) {
        if (journalists.length === 1) {
            s += ` by ${journalists[0]}`
        } else {
            s += ` by ${journalists.slice(0, journalists.length - 1).join(", ")} or ${journalists.slice(-1)[0]}`
        }
    }
    if (tags.length) {
        if (tags.length === 1) {
            s += ` with tag ${tags[0]}`
        } else {
            s += ` with tags ${tags.slice(0, tags.length - 1).join(", ")} or ${tags.slice(-1)[0]}`
        }
    }
    return s
}

const getters = {}

const actions = {
    async init({ commit, dispatch, state, rootState }) {
        const reports = (await apihelper.get("scheduled_report")).data;
        const email = (await apihelper.getOne("user", user_id, { fields: "email"})).data.email;
        await dispatch("getReports");
        commit("SET_KEYVAL", { key: "current_report_emails", value: [email]})
        commit("SET_KEYVAL", { key: "reports", value: reports });
        commit("SET_LOADING_STATE", "loaded")
    },
    async saveReport({ commit, dispatch, state, rootState}) {
        commit("SET_LOADING_STATE", "saving")
        const result = await apihelper.post("scheduled_report", {
            name: state.current_report_name,
            user_id,
            emails: state.current_report_emails,
            "period": state.current_report_period,
            "time": state.current_report_time,
            "day": state.current_report_day,
            "date": state.current_report_date,
            "state": {
                journalists: rootState.Article.journalists,
                sections: rootState.Article.sections,
                tags: rootState.Article.tags,
                quick_date_range_value: rootState.Article.quick_date_range_value,
                sort_dir: rootState.Article.sort_dir,
                visible_fields: rootState.Article.visible_fields
            }
        })
        const reports = [...state.reports, result.data];
        commit("SET_KEYVAL", { key: "reports", value: reports });
        commit("SET_LOADING_STATE", "loaded")
    },
    async getReports({ commit, dispatch, state }) {
        const reports = (await apihelper.get("scheduled_report", { "filter[user_id]": user_id })).data;
        commit("SET_KEYVAL", { key: "reports", value: reports });
    },
    async delReport({ commit, state }, report_id) {
        await apihelper.del("scheduled_report", report_id);
        const reports = state.reports.filter(report => report._id !== report_id);
        commit("SET_KEYVAL", { key: "reports", value: reports });
    },
    selectPeriod({ commit, dispatch, state }, value) {
        commit("SET_KEYVAL", { key: "current_report_period", value })
    },
    selectTime({ commit }, value) {
        commit("SET_KEYVAL", { key: "current_report_time", value })
    },
    selectDay({ commit }, value) {
        commit("SET_KEYVAL", { key: "current_report_day", value })
    },
    selectDate({ commit }, value) {
        commit("SET_KEYVAL", { key: "current_report_date", value })
    },
    toggleReports({ commit, state}) {
        commit("SET_KEYVAL", { key: "show_reports", value: !state.show_reports })
    },
    updateName({ commit }, value) {
        commit('SET_KEYVAL', { key: "current_report_name",  value })
    },
    updateEmails({ commit }, value) {
        commit('SET_KEYVAL', { key: "current_report_emails",  value })
    },
    generateName({ commit, rootState }) {
        commit("UPDATE_REPORT_NAME", rootState.Article);
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
    UPDATE_REPORT_NAME(state, Article) {
        state.current_report_name = state.report_name = report_name_builder(Article.sections, Article.journalists, Article.tags, Article.quick_date_range_value)
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