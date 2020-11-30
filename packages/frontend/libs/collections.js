"use strict";
const formatNumber = require("./utils").formatNumber;
const $ = require("jquery");
const moment = require("moment-timezone");
const { data } = require("jquery");
const rating_template = [{ _id: 5, name: "5" }, { _id: 4, name: "4" }, { _id: 3, name: "3" }, { _id: 2, name: "2" }, { _id: 1, name: "1" }, { _id: 0, name: "0" }];

class Collections {
    constructor(opts) {
        const self = this;
        const link = true;
        const list_view = true;
        const readonly = true;
        this.datadefs = {
            article: {
                name: "Articles",
                sortby: "date_published",
                sortdir: -1,
                fields: [
                    { name: "Date Published", key: "date_published", d: data => moment(data.date_published).format("YYYY-MM-DD HH:mm"), list_view },
                    { name: "Headline", key: "title", d: data => `<a href="/article/view/${data._id}">${data.title}</a>`, list_view },
                    { name: "Link", key: "url", d: data => `<a href="https://www.dailymaverick.co.za/article/${data.urlid}" target="_blank"><i class="fa fa-link"></i></a>` || "", list_view },
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
                    { name: "Running", key: "running", view: "checkbox", readonly, d: data => (data.running) ? "Yes" : "No", list_view },
                    { name: "Last run start", key: "last_run_start", readonly, d: data => data.last_run_start, list_view },
                    { name: "Last run end", key: "last_run_end", readonly, d: data => data.last_run_end, list_view },
                    { name: "Pipeline", key: "pipeline", d: data => data.pipeline, view: "code" },
                ],
                actions: [
                    {
                        name: "Run Now",
                        action: async pipeline => {
                            await $.get(`${pipelineserver}/run/${pipeline._id}`);
                        }
                    }
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
            mailer: {
                name: "Mailers",
                fields: [
                    { name: "Name", key: "name", d: data => data.name, link, list_view },
                    { name: "Report", key: "report", d: data => data.report, view: "select", options: ["revengine-mailer", "newsletter-mailer", "newsletter-management-mailer"] },
                    { name: "Subject", key: "subject", d: data => data.subject, list_view },
                    { name: "Emails", key: "emails", d: data => data.emails.join(", "), list_view, view: "text_array" },
                    { name: "Cron", key: "cron", d: data => data.cron, view: "cron" },
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
                        name: "Recency",
                        field: "recency_score",
                        multiple: true,
                        options: () => rating_template
                    },
                    {
                        name: "Frequency",
                        field: "frequency_score",
                        multiple: true,
                        options: () => rating_template
                    },
                    {
                        name: "Volume",
                        field: "volume_score",
                        multiple: true,
                        options: () => rating_template
                    },
                    {
                        name: "Value",
                        field: "monetary_value_score",
                        multiple: true,
                        options: () => rating_template
                    },
                    {
                        name: "Authors",
                        field: "authors",
                        multiple: true,
                        options: async () => {
                            return (await $.get(`/reader/list/authors`)).map(author => {
                                return {
                                    _id: author,
                                    name: author
                                }
                            });
                        }
                    },
                    {
                        name: "Sections",
                        field: "sections",
                        multiple: true,
                        options: async () => {
                            return (await $.get(`/reader/list/sections`)).map(author => {
                                return {
                                    _id: author,
                                    name: author
                                }
                            });
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