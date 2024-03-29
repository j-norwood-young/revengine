const express = require('express');
const router = express.Router();
const config = require("config");
const crypto = require('crypto');
const esclient = require("@revengine/common/esclient");
const jsonexport = require('jsonexport');
const moment = require("moment");
const recency = require("@revengine/reports/libs/recency");
const frequency = require("@revengine/reports/libs/frequency");
const value = require("@revengine/reports/libs/value");
const Sailthru = require("@revengine/mailer/sailthru");

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

router.get("/ammalgamate/:email", async(req, res) => {
    try {
        let parts = req.params.email.split("@");
        let s = `${escapeRegExp(parts[0])}(\\+.*)@${escapeRegExp(parts[1])}`
        // console.log(s);
        const query = {
            "$or": [
                {
                    "email": {
                        "$regex": req.params.email,
                        "$options": "i"
                    }
                },
                {
                    "email": {
                        "$regex": s,
                        "$options": "i"
                    }
                }
            ]
        }
        // console.log(query);
        const datasources = (await req.apihelper.get("datasource")).data;
        let result = {};
        for (let datasource of datasources) {
            // console.log(datasource)
            result[datasource.name] = await req.apihelper.query(datasource.model, query);
        }
        res.send(result);
    } catch(err) {
        console.error(err);
        res.send(err);
    }
})

const render_reader_view = async (req, res) => {
    try {
        console.log("Getting reader", req.params.reader_id);
        const d = {};
        d["populate[label]"] = "name";
        const reader = (await req.apihelper.getOne("reader", req.params.reader_id, d)).data;
        const labels = (await req.apihelper.get("label", { "sort[name]": 1, "fields": "name" })).data;
        reader.labels = labels.filter(label => reader.label_id.includes(label._id)).map(label => label.name);
        const segments = (await req.apihelper.get("segmentation", { "sort[name]": 1, "fields": "name" })).data;
        reader.segments = segments.filter(segment => reader.segmentation_id.includes(segment._id)).map(segment => segment.name);
        // reader.touchbase_subscriber = (await req.apihelper.get("touchbasesubscriber", { "filter[email]": `$regex:/${reader.email}/i`, "populate": "touchbaselist" })).data;
        if (reader.wordpress_id) {
            reader.woocommerce_membership = (await req.apihelper.get("woocommerce_membership", { "filter[customer_id]": reader.wordpress_id, "sort[date_modified]": -1 })).data;
            reader.woocommerce_order = (await req.apihelper.get("woocommerce_order", { "filter[customer_id]": reader.wordpress_id, "sort[date_created]": -1 })).data;
            reader.woocommerce_subscription = (await req.apihelper.get("woocommerce_subscription", { "filter[customer_id]": reader.wordpress_id, "sort[date_modified]": -1 })).data;
            reader.recency = await recency(reader._id);
            reader.frequency = await frequency(reader._id);
            reader.value = await value(reader._id);
        }
        // reader.vouchers = (await req.apihelper.get("voucher", { "filter[reader_id]": reader._id, "sort[createdAt]": -1, "populate[vouchertype]": "name" })).data;
        let display_name = reader.email;
        if (reader.first_name || reader.last_name) display_name = `${reader.first_name || ""} ${reader.last_name || ""}`.trim();
        reader.display_name = display_name;
        reader.email_hash = crypto.createHash('md5').update(reader.email.trim().toLowerCase()).digest("hex")
        reader.rfv = (await req.apihelper.get("rfv", { "filter[reader_id]": reader._id, "sort[date]": -1, "limit": 1 })).data.pop();
        let sailthru_user = null;
        let sailthru_user_lists = [];
        try {
            sailthru_user = await Sailthru.get_user(reader.wordpress_id);
            if (sailthru_user.lists) {
                for (let list in sailthru_user.lists) {
                    sailthru_user_lists.push(list);
                }
            }
            sailthru_user_lists.sort();
        } catch (err) {
            console.error(err);
        }
        const sailthru_templates = await Sailthru.get_templates();
        sailthru_templates.sort((a, b) => a.name.localeCompare(b.name));
        const sailthru_lists = await Sailthru.get_lists();
        sailthru_lists.sort((a, b) => a.name.localeCompare(b.name));
        res.render("readers/reader", { title: `Reader: ${display_name}`, reader, sailthru_templates, sailthru_lists, sailthru_user, sailthru_user_lists });
    } catch (err) {
        console.error(err);
        res.render("error", err);
    }
}

router.get("/view/:reader_id", render_reader_view)

router.get("/activities/:reader_id", async (req, res) => {
    try {
        const activities = await req.apihelper.get("activity", { "filter[reader_id]": req.params.reader_id })
        res.send(activities.data);
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
})

router.get("/data/:reader_id", async (req, res) => {
    try {
        const data = {};
        
        let interval = req.query.interval || "month";
        const reader = await req.apihelper.getOne("reader", req.params.reader_id, { fields: "wordpress_id" });
        if (!reader.wordpress_id) throw("Wordpress ID not found");
        let q_article_progress = {
            index: "pageviews_progress",
            body: {
                "size": 0,
                "query": {
                    "match": {
                        "user_id": reader.wordpress_id
                    }
                },
                "aggs": {
                    "article_progress": {
                        "date_histogram": {
                            "field": "time",
                            "interval": interval
                        },
                        "aggs": {
                            "article_progress_avg": {
                                "avg": {
                                    "field": "article_progress"
                                }
                            },
                            "article_progress_deviation": {
                                "median_absolute_deviation": {
                                    "field": "article_progress"
                                }
                            }
                        }
                    }
                }
            }
        };
        const article_progress_result = await esclient.search(q_article_progress);
        data.article_progress = article_progress_result.aggregations.article_progress;
        let q_pageviews_timespent = {
            index: "pageviews_time_spent",
            body: {
                "size": 0,
                "query": {
                    "match": {
                        "user_id": reader.wordpress_id
                    }
                },
                "aggs": {
                    "timespent_avg": {
                        "date_histogram": {
                            "field": "time",
                            "interval": interval
                        },
                        "aggs": {
                            "timespent_avg": {
                                "avg": {
                                    "field": "timespent"
                                }
                            },
                            "timespent_sum": {
                                "sum": {
                                    "field": "timespent"
                                }
                            }
                        }
                    }
                }
            }
        };
        const timespent_result = await esclient.search(q_pageviews_timespent);
        // console.log(timespent_result);
        data.timespent_avg = timespent_result.aggregations.timespent_avg;
        res.send(data)
    } catch(err) {
        console.error(err);
        res.status(500).send({ error: err });
    }
})

router.get("/list/authors", async(req, res) => {
    try {
        const pipeline = [
            {
                $unwind: "$authors"
            },
            {
                $group: {
                    _id: "$authors"
                }
            },
            {
                $sort: {
                    "_id": 1
                }
            }
        ]
        const authors = (await req.apihelper.aggregate("reader", pipeline)).data.map(item => item._id);
        res.send(authors);
    } catch(err) {
        console.error(err);
        res.status(500).send({ error: err });
    }
})

router.get("/list/labels", async (req, res) => {
    try {
        const labels = (await req.apihelper.get("label", { "sort[name]": 1 })).data;
        res.send(labels);
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: err });
    }
})

router.get("/list/segments", async (req, res) => {
    try {
        const segments = (await req.apihelper.get("segmentation", { "sort[name]": 1 })).data;
        res.send(segments);
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: err });
    }
})

router.get("/list/sections", async (req, res) => {
    try {
        const pipeline = [
            {
                $unwind: "$sections"
            },
            {
                $group: {
                    _id: "$sections"
                }
            },
            {
                $sort: {
                    "_id": 1
                }
            }
        ]
        const sections = (await req.apihelper.aggregate("reader", pipeline)).data.map(item => item._id);
        res.send(sections);
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: err });
    }
})

router.get("/facet", async (req, res) => {
    try {
        const author_query = [
            { $group: { _id: { author: '$author' } } },
            { $sort: { author: 1 } }
        ]
        const authors = (await req.apihelper.aggregate("article", author_query)).data.map(item => item._id.author);
        authors.sort();
        const tag_query = [
            { $unwind: "$tags" },
            { $group: { _id: { tags: '$tags' }, count: { $sum: 1 } } },
            { $match: { count: { $gte: 20 }}},
            { $sort: { tags: 1 } }
        ]
        const tags = (await req.apihelper.aggregate("article", tag_query)).data.map(item => item._id.tags);
        tags.sort();
        // console.log(tags);
        res.render("readers/facet", { title: "Facet users", authors, tags})
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: err });
    }
})

router.post("/facet/author", async (req, res) => {
    try {
        const author = req.body.author;
        const query = {
            index: "pageviews_copy",
            body: {
                "size": 1,
                "query": {
                    "bool": {
                        "must": [
                            {
                                "exists": {
                                    "field": "article_id"
                                }
                            },
                            {
                                "exists": {
                                    "field": "user_id"
                                }
                            },
                            {
                                "match": {
                                    "author_id": author
                                }
                            }
                        ],
                        "must_not": [
                            {
                                "match": {
                                    "user_id": 0
                                }
                            }
                        ]
                    }
                },
                "aggs": {
                    "result": {
                        "terms": {
                            "field": "user_id",
                            "size": 10000
                        }
                    }
                }
            }
        }
        const query_result = await esclient.search(query);
        const reader_ids = (query_result.aggregations.result.buckets).map(item => item.key);
        const readers = [];
        for (let reader_id of reader_ids) {
            readers.push((await req.apihelper.get("reader", { "filter[id]": reader_id, "fields": "id,display_name,first_name,last_name,email"})).data[0]);
        }
        // console.log(readers);
        const csv = await jsonexport(readers);
        res.attachment(`readers-${author}-${moment().format("YYYYMMDDHHmmss")}.csv`);
        res.send(csv);
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: err });
    }
})

router.post("/facet/tag", async (req, res) => {
    try {
        const tag = req.body.tag;
        const query = {
            index: "pageviews_copy",
            body: {
                "size": 1,
                "query": {
                    "bool": {
                        "must": [
                            {
                                "exists": {
                                    "field": "article_id"
                                }
                            },
                            {
                                "exists": {
                                    "field": "user_id"
                                }
                            },
                            {
                                "match": {
                                    "tags": tag
                                }
                            }
                        ],
                        "must_not": [
                            {
                                "match": {
                                    "user_id": 0
                                }
                            }
                        ]
                    }
                },
                "aggs": {
                    "result": {
                        "terms": {
                            "field": "user_id",
                            "size": 10000
                        }
                    }
                }
            }
        }
        const query_result = await esclient.search(query);
        const reader_ids = (query_result.aggregations.result.buckets).map(item => item.key);
        const readers = [];
        for (let reader_id of reader_ids) {
            readers.push((await req.apihelper.get("reader", { "filter[id]": reader_id, "fields": "id,display_name,first_name,last_name,email" })).data[0]);
        }
        // console.log(readers);
        const csv = await jsonexport(readers);
        res.attachment(`readers-${tag}-${moment().format("YYYYMMDDHHmmss")}.csv`);
        res.send(csv);
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: err });
    }
})

router.get("/expunge/:reader_id", async (req, res) => {
    try {
        // const reader = await req.apihelper.getOne("reader", req.params.reader_id);
        // const wordpressuser = req.apihelper.get("wordpressuser", {"filter[email]": reader.email });
        // await req.apihelper.del_perm_cascade("wordpressuser", wordpressuser._id);
        // const wordpressuser = req.apihelper.get("woocommerce_membership", {"filter[customer_id]": wordpressuser.id });
        // await req.apihelper.del_perm_cascade("woocommerce_membership", wordpressuser._id);
        await req.apihelper.del_perm_cascade("reader", req.params.reader_id);
        res.render("readers/expunged", { title: "Reader Expunged", reader });
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: err });
    }
})

router.get("/assign_vouchers/:reader_id", async (req, res) => {
    try {
        const vouchertypes = (await req.apihelper.get("vouchertype", { "sort[name]": 1 })).data;
        const reader_id = req.params.reader_id;
        const month = moment();
        let results = [];
        const valid_from = month.startOf("month").format("YYYY-MM-DD");
        const valid_to = month.endOf("month").format("YYYY-MM-DD");
        for (let vouchertype of vouchertypes) {
            console.log("Processing", vouchertype);
            const vouchers = (await req.apihelper.query("voucher", {
                "$and": [
                    {
                        "vouchertype_id": vouchertype
                    },
                    {
                        "valid_from": {
                            "$gte": valid_from
                        }
                    },
                    {
                        "valid_to": {
                            "$lte": valid_to
                        }
                    }
                ]
            })).data;
            const data = [];
            const empty_vouchers = vouchers.filter(voucher => !voucher.reader_id);
            let voucher = vouchers.find(voucher => voucher.reader_id === reader_id);
            if (!voucher) {
                voucher = empty_vouchers.pop();
                if (!voucher) throw "Not enough vouchers";
                data.push({
                    _id: voucher._id,
                    reader_id
                });
            }
            const result = await req.apihelper.bulk_put("voucher", "_id", data);
            results.push({ vouchertype, result });
        }
        // res.send({ vouchertypes, valid_from, valid_to, results });
        res.redirect(`/reader/view/${reader_id}`);
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: err });
    }
});

router.get("/bulk_update", async (req, res) => {
    res.render("readers/bulk_update");
})

router.post("/bulk_update", async (req, res) => {
    try {
        const emails = req.body.emails.split("\n").map(email => email.trim().toLowerCase());
        const uber_code_override = req.body.uber_code_override;
        const data = emails.map(email => {
            const result = { email };
            if (uber_code_override) result.uber_code_override = uber_code_override;
            return result;
        })
        // console.log(data);
        const result = await req.apihelper.bulk_put("reader", "email", data);
        res.render("readers/bulk_update_result", result);
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: err });
    }
})

router.post("/sailthru/subscribe/:reader_id", async (req, res, next) => {
    try {
        const reader_id = req.params.reader_id;
        const list = req.body.list;
        if (!list) throw("No list specified");
        const result = await Sailthru.subscribe_reader_to_list(reader_id, list);
        if (result.ok === true) {
            res.locals.message = {
                type: "success",
                msg: `Subscribed to ${list}`,
            }
            next();
        } else {
            res.locals.message = {
                type: "danger",
                msg: result,
            }
            next();
        }
    } catch (err) {
        res.locals.message = {
            type: "danger",
            msg: err,
        }
        next();
    }
}, render_reader_view);

router.post("/sailthru/unsubscribe/:reader_id", async (req, res, next) => {
    try {
        const reader_id = req.params.reader_id;
        const list = req.body.list;
        if (!list) throw("No list specified");
        const result = await Sailthru.unsubscribe_reader_from_list(reader_id, list);
        if (result.ok === true) {
            res.locals.message = {
                type: "success",
                msg: `Unsubscribed from ${list}`,
            }
            next();
        } else {
            res.locals.message = {
                type: "danger",
                msg: result,
            }
            next();
        }
    } catch (err) {
        res.locals.message = {
            type: "danger",
            msg: err,
        }
        next();
    }
}, render_reader_view);

router.post("/sailthru/send/:reader_id", async (req, res, next) => {
    try {
        const reader_id = req.params.reader_id;
        const template = req.body.template;
        if (!template) throw("No template specified");
        const result = await Sailthru.send_template_to_reader(reader_id, template);
        console.log(result);
        res.locals.message = {
            type: "success",
            msg: `Email sent using template ${template}. Send ID ${result.send_id}`,
        }
        next();
    } catch (err) {
        res.locals.message = {
            type: "danger",
            msg: err,
        }
        next();
    }
}, render_reader_view);

module.exports = router;