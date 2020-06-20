const express = require('express');
const router = express.Router();
const config = require("config");
const crypto = require('crypto');
const Elasticsearch = require("elasticsearch");
const esclient = new Elasticsearch.Client({ ...config.elasticsearch });

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
        const datasources = (await req.apihelper.get("datasource")).data;
        let d = {};
        for (datasource of datasources) {
            d[`populate[${datasource.model}]`] = "";
        }
        d["populate[labels]"] = "name";
        const reader = await req.apihelper.getOne("reader", req.params.reader_id, d)
        let display_name = reader.email;
        if (reader.first_name || reader.last_name) display_name = `${reader.first_name || ""} ${reader.last_name || ""}`.trim();
        reader.display_name = display_name;
        reader.email_hash = crypto.createHash('md5').update(reader.email.trim().toLowerCase()).digest("hex")
        res.render("readers/reader", {title: `Reader: ${display_name}`, reader });
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

module.exports = router;