"use strict";
import { formatNumber } from "./utils.js";
import $ from "jquery";
import moment from "moment-timezone";
const rating_template = [{ _id: 5, name: "5" }, { _id: 4, name: "4" }, { _id: 3, name: "3" }, { _id: 2, name: "2" }, { _id: 1, name: "1" }, { _id: 0, name: "0" }];
import * as nlp from "./nlp.js";

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
                    {
                        name: "Pic",
                        d: data => `<img src="${data.img_thumbnail}" width="50" height="50" />`,
                        list_view
                    },
                    { name: "Date Published", key: "date_published", d: data => moment(data.date_published).format("YYYY-MM-DD HH:mm"), list_view },
                    { name: "Headline", key: "title", d: data => `<a href="/article/view/${data._id}">${data.title}</a>`, list_view },
                    { name: "Link", key: "url", d: data => `<a href="https://www.dailymaverick.co.za/article/${data.urlid}" target="_blank"><i class="fa fa-link"></i></a>` || "", list_view },
                    { name: "Author", key: "author", d: data => data.author || "", list_view },
                    {
                        name: "Page Views",
                        d: data => formatNumber(data.hits.reduce((acc, o) => acc + o.count, 0)),
                        list_view
                    },
                    { name: "Sentiment", d: data => nlp.sentiment(data.content).sentiment, list_view }
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
                    "title", "author", "tags", "sections"
                ]
            },
            goal: {
                name: "Goals",
                sortby: "name",
                sortdir: 1,
                fields: [
                    { name: "Name", key: "name", d: data => data.name, link, list_view },
                ],
                filters: [
                ],
                populate: {
                },
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
                    { name: "Auto Run", key: "autorun", d: data => (data.autorun) ? "Yes" : "No", view: "checkbox", list_view },
                    { name: "Running", key: "running", view: "checkbox", readonly, d: data => (data.running) ? "Yes" : "No", list_view },
                    { name: "Last run start", key: "last_run_start", readonly, d: data => moment(data.last_run_start).format("YYYY-MM-DD HH:mm"), list_view },
                    { name: "Last run end", key: "last_run_end", readonly, d: data => moment(data.last_run_end).format("YYYY-MM-DD HH:mm"), list_view },
                    { name: "Pipeline", key: "pipeline", d: data => data.pipeline, view: "code" },
                ],
                actions: [
                    {
                        name: "Run Now",
                        action: async d => {
                            await $.get(`${pipelineserver}/run/${d.data._id}`);
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
            label: {
                name: "Label",
                fields: [
                    { name: "Name", key: "name", d: data => data.name, link, list_view, note: "These labels could be visible to the reader. Refrain from insulting, demeaning, negative or avaricious names." },
                    { name: "Display on dashboard?", key: "display_on_dashboard", d: data => (data.display_on_dashboard), "view": "checkbox" },
                    {
                        name: "Count", 
                        key: "last_count",
                        list_view,
                        d: async data => {
                            return formatNumber(data.last_count);
                        }
                    },
                    { name: "Download", d: data => `<a href="/download/json/label/${data._id}">JSON</a> | <a href="/download/csv/label/${data._id}">CSV</a> | <a href="/download/label/autologins/${data._id}">Autologins</a>`, view: "none", list_view},
                    { name: "Touchbase", d: data => `<a href="/mails//mailinglist/subscribe_by_label/${data._id}">Add to list</a>`, view: "none", list_view},
                    { name: "Code", key: "code", d: data => data.code, list_view },
                    { name: "Prep Function", key: "fn", d: data => data.code, "view": "code", note: "Optional. Runs before applying rule. Eg: return async opts => { return [ {_id: <user_id>, name: \"val\" } ] } Available: opts.jxphelper, opts.moment. " },
                    { name: "Rules", key: "rules", d: data => data.rules, "view": "code_array", note: `Eg: { "label_data.email_clicks_in_last_5_days": { "$gte": 5 } }` },
                ],
                search_fields: [
                    "name",
                ]
            },
            mailer: {
                name: "Mailers",
                fields: [
                    { name: "Name", key: "name", d: data => data.name, link, list_view },
                    { name: "Report", key: "report", d: data => data.report, view: "select", options: ["website_content_report", "newsletter_content_report", "newsletter_management_report"] },
                    { name: "Subject", key: "subject", d: data => data.subject, list_view },
                    { name: "Emails", key: "emails", d: data => data.emails.join(", "), list_view, view: "text_array" },
                    { name: "Cron", key: "cron", d: data => data.cron, view: "cron" },
                ],
                search_fields: [
                    "name",
                ]
            },
            mailrun: {
                name: "Mail Run",
                sortby: "createdAt",
                sortdir: -1,
                fields: [
                    { name: "Name", key: "name", d: data => data.name, link, list_view },
                    { name: "Transactional Mail", key: "touchbasetransactional_id", d: data => data.transacionalmail_id, foreign_collection: "touchbasetransactional", view: "foreign_select", },
                    { name: "Code", key: "code", d: data => data.code, note: "Must be unique, eg. monthly-uber-mail-2021-01" },
                    { name: "State", key: "state", d: data => data.state, view: "select", options: ['due', 'running', 'complete', 'cancelled', 'paused', 'failed' ], list_view },
                    { name: "Start Date", key: "start_time", d: data => data.start_time ? moment(data.start_time).format("YYYY-MM-DD HH:mm:ss") : "", "view": "datetime", list_view },
                    { name: "End Date", key: "end_time", d: data => data.end_time ? moment(data.end_time).format("YYYY-MM-DD HH:mm:ss") : "", "view": "text", readonly, list_view },
                    { name: "", d: data => `<a href="/mails/mailrun/progress/${data._id}">View Progress</a>`, list_view, view: "none"},
                    { name: "Queued", d: data => data.queued_reader_ids.length, list_view: true, view: "none" },
                    { name: "Sent", d: data => data.sent_reader_ids.length, list_view: true, view: "none" },
                    { name: "Failed", d: data => data.failed_reader_ids.length, list_view: true, view: "none" },
                    // { name: "Queued Mails", key: "queued", view: "list", }
                ],
                populate: {
                    "queued": "name,email"
                },
                search_fields: [
                    "name",
                ],
                filters: [
                    {
                        name: "State",
                        field: "state",
                        multiple: false,
                        options: () => [ {_id: 'due', name: "Due"}, {_id: 'running', name: "Running"}, {_id: 'complete', name: "Complete"}, {_id: 'cancelled', name: "Cancelled"}, {_id: 'paused', name: "Paused"} ]
                    },
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
                    { name: "Paying?", key: "paying_customer", d: data => (data.paying_customer) ? "<i class='fa fa-check-circle'></i>" : "", list_view }
                ],
                filters: [
                    {
                        name: "Labels",
                        field: "label_id",
                        multiple: true,
                        options: async () => {
                            return (await $.get(`/reader/list/labels`)).map(label => {
                                return {
                                    _id: label._id,
                                    name: label.name
                                }
                            });
                        }
                    },
                    {
                        name: "Segments",
                        field: "segmentation_id",
                        multiple: true,
                        options: async () => {
                            return (await $.get(`/reader/list/segments`)).map(segment => {
                                return {
                                    _id: segment._id,
                                    name: segment.name
                                }
                            });
                        }
                    },
                    // {
                    //     name: "Recency",
                    //     field: "recency_score",
                    //     multiple: true,
                    //     options: () => rating_template
                    // },
                    // {
                    //     name: "Frequency",
                    //     field: "frequency_score",
                    //     multiple: true,
                    //     options: () => rating_template
                    // },
                    // {
                    //     name: "Volume",
                    //     field: "volume_score",
                    //     multiple: true,
                    //     options: () => rating_template
                    // },
                    // {
                    //     name: "Value",
                    //     field: "monetary_value_score",
                    //     multiple: true,
                    //     options: () => rating_template
                    // },
                    // {
                    //     name: "Authors",
                    //     field: "authors",
                    //     multiple: true,
                    //     options: async () => {
                    //         return (await $.get(`/reader/list/authors`)).map(author => {
                    //             return {
                    //                 _id: author,
                    //                 name: author
                    //             }
                    //         });
                    //     }
                    // },
                    // {
                    //     name: "Sections",
                    //     field: "sections",
                    //     multiple: true,
                    //     options: async () => {
                    //         return (await $.get(`/reader/list/sections`)).map(author => {
                    //             return {
                    //                 _id: author,
                    //                 name: author
                    //             }
                    //         });
                    //     }
                    // },
                ],
                populate: {
                },
                search_fields: [
                    "first_name", "last_name", "email"
                ]
            },
            segmentation: {
                name: "Segments",
                fields: [
                    { name: "Name", key: "name", d: data => `<a href="/segmentation/edit/${data._id}">${data.name}</a>`, "view": "text", list_view },
                    {
                        name: "Count",
                        key: "last_count",
                        list_view,
                        d: async data => {
                            return formatNumber(data.last_count);
                        },
                        view: "none"
                    },
                    { name: "Download", d: data => `<a href="/download/json/segmentation/${data._id}">JSON</a> | <a href="/download/csv/segmentation/${data._id}">CSV</a>`, view: "none", list_view},
                    { name: "Touchbase", d: data => `<a href="/mails//mailinglist/subscribe_by_segment/${data._id}">Add to list</a>`, view: "none", list_view},
                    { name: "Code", key: "code", d: data => data.code, "view": "text", list_view },
                ]
            },
            touchbasetransactional: {
                name: "Touchbase Transactional",
                fields: [
                    { name: "Name", key: "name", d: data => data.name, "view": "text", list_view, link },
                    { name: "Touchbase ID", key: "touchbase_transactional_id", d: data => data.touchbase_transactional_id, "view": "text" },
                    { name: "Function", key: "data_fn", d: data => data.data_fn, view: "code"},
                    { name: "BCC", key: "bcc", d: data => data.bcc, view: "email" },
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
            voucher: {
                name: "Voucher",
                fields: [
                    { name: "Code", key: "code", d: data => data.code, view: "text", list_view, link },
                    { name: "Type", key: "vouchertype_id", d: data => data.vouchertype.name, "view": "text", list_view },
                    { name: "Valid From", key: "valid_from", d: data => moment(data.valid_from).format("YYYY-MM-DD"), "view": "date", list_view },
                    { name: "Valid To", key: "valid_to", d: data => moment(data.valid_to).format("YYYY-MM-DD"), "view": "date", list_view },
                    { name: "User ID", key: "reader_id", d: data => (data.reader && data.reader.email) ? data.reader.email : "Unassigned", "view": "text", list_view },
                ],
                populate: [
                    "vouchertype",
                    "reader"
                ],
                search_fields: [
                    "code",
                ],
                filters: [
                    {
                        name: "Months",
                        field: "valid_from",
                        // multiple: true,
                        options: async () => {
                            const months = [];
                            const m = new moment();
                            for (let x = 0; x < 12; x++) {
                                months.push(moment().add(x, "month").startOf("month"));
                            }
                            return months.map(month => {
                                return {
                                    _id: month.format("YYYY-MM-DD"),
                                    name: month.format("MMMM YYYY")
                                }
                            });
                        }
                    },
                    {
                        name: "Types",
                        field: "vouchertype_id",
                        options: async () => (await $.get(`/list/json/raw/vouchertype`)).data
                    },
                    // {
                    //     name: "Readers",
                    //     field: "reader_id",
                    //     typeahead: true,
                    //     options: async () => (await $.get(`/list/json/raw/reader?fields=email,first_name,last_name&sort[first_name]=1&sort[last_name]=1&sort[email]=1`)).data.map(reader => { return { _id: reader._id, name: `${reader.first_name || ""} ${reader.last_name || ""} ${reader.email || ""}`  }})
                    // },
                ]
            },
            vouchertype: {
                name: "Voucher Type",
                fields: [
                    { name: "Name", key: "name", d: data => data.name, "view": "text", list_view, link },
                    { name: "Code", key: "code", d: data => data.code, "view": "text", list_view },
                ],
                search_fields: [
                    "name",
                ]
            },
        };
    }
}

export default Collections;