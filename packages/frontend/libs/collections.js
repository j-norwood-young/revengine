"use strict";
const formatNumber = require("./utils").formatNumber;
const $ = require("jquery");
const moment = require("moment-timezone");
const { data } = require("jquery");

class Collections {
    constructor(opts) {
        const self = this;
        const link = true;
        const list_view = true;
        const readonly = true;
        this.datadefs = {
            article: {
                name: "Article",
                sortby: "published_at",
                sortdir: -1,
                fields: [
                    { name: "Date Published", key: "published_at", d: data => moment(data.published_at).format("YYYY-MM-DD HH:mm"), list_view },
                    { name: "Headline", key: "headline", d: data => `<a href="/article/view/${data._id}">${data.headline}</a>`, list_view },
                    { name: "Link", key: "url", d: data => `<a href="${data.url}" target="_blank"><i class="fa fa-link"></i></a>` || "", list_view },
                    { name: "Author", key: "author", d: data => data.author || "", list_view },
                    // { name: "Sections", key: "sections", d: data => data.sections || "", list_view },
                ],
                filters: [
                    // {
                    //     name: "Author",
                    //     field: "author",
                    //     multiple: true,
                    //     options: async () => {
                    //         const labels = (await $.get(`${apiserver}/label?apikey=${apikey}&sort[name]=1`)).data;
                    //         return labels;
                    //     }
                    // },
                ],
                populate: {
                },
                search_fields: [
                    "headline", "author"
                ]
            },
            datasource: {
                name: "Data Source",
                sortby: "name",
                sortdir: 1,
                fields: [
                    { name: "UrlID", key: "urlid", d: data => data.urlid, link, list_view, readonly },
                    { name: "Name", key: "name", d: data => data.name, link, list_view },
                    { name: "Model", key: "model" },
                    { name: "Url", key: "url" },
                    { name: "Key Field", key: "key_field" },
                    { name: "Username", key: "username" },
                    { name: "Password", key: "pwd" },
                    { name: "Run Schedule", key: "run_schedule", d: data => data.run_schedule },
                    { name: "Queue Schedule", key: "queue_schedule", d: data => data.queue_schedule },
                    // { name: "Prefetch Models", key: "prefetch_models", options: ["touchbaselist"], d: data => data.prefetch_models, view: "multiselect"},
                    { name: "Parallel processes", key: "parallel_processes", "view": "number", "min": 0, "max": 100, "step": 1 },
                    { name: "Per Page", key: "per_page", "view": "number", "min": 0, "step": 1 },
                    // { name: "Params", key: "params" },
                    { name: "Queue Generator", key: "queue_generator", "view": "code" },
                    { name: "Map", key: "map", "view": "code" },
                    { name: "Queue last updated", key: "queue_last_updated", "view": "text", readonly },
                    { name: "Queue length", d: data => data.queue.length, "view": "text", readonly },
                    { name: "Last result", key: "last_result", "view": "json" },
                ],
                search_fields: [
                    "name",
                ],
                actions: [
                    {
                        name: "Queue",
                        action: async datasource => {
                            await $.get(`${daemonserver}/queue/${datasource._id}`);
                        }
                    },
                    {
                        name: "Run",
                        action: async datasource => {
                            await $.get(`${daemonserver}/run/${datasource._id}`);
                        }
                    },
                    {
                        name: "Test Queue",
                        action: async datasource => {
                            console.log(`${daemonserver}/testqueue/${datasource._id}`);
                            let result = await $.get(`${daemonserver}/testqueue/${datasource._id}`);
                            console.log(result);
                        }
                    },
                    {
                        name: "Clear Queue",
                        action: async datasource => {
                            let result = await $.get(`${daemonserver}/queue/clear/${datasource._id}`);
                        }
                    }
                ]
            },
            pipeline: {
                name: "Data Pipeline",
                fields: [
                    { name: "Name", key: "name", d: data => data.name, link, list_view },
                    { name: "Cron", key: "cron", d: data => data.cron, view: "cron" },
                    { name: "Running", key: "running", view: "checkbox", readonly },
                    { name: "Last run end", key: "last_run_end", readonly, d: data => data.last_run_end, list_view },
                    { name: "Last run start", key: "last_run_start", readonly, d: data => data.last_run_start },
                    { name: "Pipeline", key: "pipeline", d: data => data.pipeline, view: "code" },
                ]
            },
            touchbaselist: {
                name: "Newsletters",
                fields: [
                    { name: "Name", key: "name", d: data => data.name, link, list_view },
                    { name: "ID", key: "list_id", d: data => data.list_id, list_view },
                ],
                search_fields: [
                    "name",
                ]
            },
            label: {
                name: "Label",
                fields: [
                    { name: "Name", key: "name", d: data => data.name, link, list_view, note: "These labels could be visible to the reader. Refrain from insulting, demeaning, negative or avaricious names." },
                    { name: "Rules", key: "rules", d: data => data.rules, "view": "code_array" }
                ],
                search_fields: [
                    "name",
                ]
            },
            reader: {
                name: "Reader",
                sortby: "email",
                sortdir: 1,
                fields: [
                    { name: "Email", key: "email", d: data => `<a href="/reader/view/${data._id}">${data.email}</a>`, list_view },
                    { name: "First Name", key: "first_name", d: data => data.first_name || "", list_view },
                    { name: "Last Name", key: "last_name", d: data => data.last_name || "", list_view },
                ],
                filters: [
                    {
                        name: "Select Labels",
                        field: "labels",
                        multiple: true,
                        options: async () => {
                            const labels = (await $.get(`${apiserver}/label?apikey=${apikey}&sort[name]=1`)).data;
                            return labels;
                        }
                    },
                ],
                populate: {
                },
                search_fields: [
                    "first_name", "last_name", "email"
                ]
            },
            user: {
                name: "User",
                fields: [
                    { name: "Email", key: "email", d: data => data.email, link, list_view },
                    { name: "Name", key: "name", d: data => data.name, "view": "text", list_view },
                    { name: "Admin", key: "admin", d: data => (data.admin), "view": "checkbox" }
                ],
                search_fields: [
                    "name",
                ]
            },
        };
    }
}

module.exports = Collections;