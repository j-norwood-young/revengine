const express = require('express');
const router = express.Router();
const config = require("config");
const crypto = require('crypto');
const Elasticsearch = require("elasticsearch");
const esclient = new Elasticsearch.Client({ ...config.elasticsearch });
const jsonexport = require('jsonexport');
const moment = require("moment");
const recency = require("@revengine/reports/libs/recency");
const frequency = require("@revengine/reports/libs/frequency");
const value = require("@revengine/reports/libs/value");

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

router.get("/ammalgamate/:email", async(req, res) => {
    try {
        let parts = req.params.email.split("@");
        let s = `${escapeRegExp(parts[0])}(\\+.*)@${escapeRegExp(parts[1])}`
        console.log(s);
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
        console.log(query);
        const datasources = (await req.apihelper.get("datasource")).data;
        let result = {};
        for (let datasource of datasources) {
            console.log(datasource)
            result[datasource.name] = await req.apihelper.query(datasource.model, query);
        }
        res.send(result);
    } catch(err) {
        console.error(err);
        res.send(err);
    }
})

router.get("/view/:reader_id", async (req, res) => {
    try {
        const d = {};
        d["populate[labels]"] = "name";
        const reader = (await req.apihelper.getOne("reader", req.params.reader_id, d)).data;
        reader.touchbase_subscriber = (await req.apihelper.get("touchbasesubscriber", { "filter[email]": reader.email, "populate": "touchbaselist" })).data;
        reader.woocommerce_membership = (await req.apihelper.get("woocommerce_membership", { "filter[customer_id]": reader.id })).data;
        reader.woocommerce_order = (await req.apihelper.get("woocommerce_order", { "filter[customer_id]": reader.id })).data;
        reader.woocommerce_subscription = (await req.apihelper.get("woocommerce_subscription", { "filter[customer_id]": reader.id })).data;
        let display_name = reader.email;
        if (reader.first_name || reader.last_name) display_name = `${reader.first_name || ""} ${reader.last_name || ""}`.trim();
        reader.display_name = display_name;
        reader.email_hash = crypto.createHash('md5').update(reader.email.trim().toLowerCase()).digest("hex")
        reader.recency = await recency(reader._id);
        reader.frequency = await frequency(reader._id);
        reader.value = await value(reader._id);
        res.render("readers/reader", { title: `Reader: ${display_name}`, reader });
    } catch (err) {
        console.error(err);
        res.render("error", err);
    }
})

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
        console.log(timespent_result);
        data.timespent_avg = timespent_result.aggregations.timespent_avg;
        res.send(data)
    } catch(err) {
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
        console.log(tags);
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

module.exports = router;