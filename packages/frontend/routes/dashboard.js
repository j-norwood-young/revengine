const express = require('express');
const router = express.Router();
const config = require("config");

const Elasticsearch = require("elasticsearch");
const esclient = new Elasticsearch.Client({ ...config.elasticsearch.server });


router.get("/", async (req, res) => {
    try {
        const labels = (await req.apihelper.get("label")).data;
        for (let label of labels) {
            label.length = (await req.apihelper.get("reader", { limit: 1, "filter[labels]": label._id })).count;
        }
        labels.sort((a, b) => b.length - a.length);
        const reader_count = (await req.apihelper.get("reader", { limit: 1 })).count;
        res.render("dashboard", { title: "Dashboard", reader_count, labels });
    } catch(err) {
        console.error(err);
        res.render("error", err);
    }
});

router.get("/daily_email", async(req, res) => {
    res.render("reports/daily_email", { title: "Daily Email Report"});
});

router.get("/article_progress", async(req, res) => {
    try {
        const data = {};
        let interval = req.query.interval || "month";
        const query = {
            index: "pageviews_progress",
            body: {
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
                            "article_progress_sum": {
                                "sum": {
                                    "field": "article_progress"
                                }
                            }
                        }
                    }
                },
                "size": 0,
                "docvalue_fields": [
                    {
                        "field": "time",
                        "format": "date_time"
                    }
                ],
                "query": {
                    "bool": {
                        "must": [
                            {
                                "range": {
                                    "time": {
                                        "gte": 1586091043889,
                                        "lte": 1586177443889,
                                        "format": "epoch_millis"
                                    }
                                }
                            }
                        ]
                    }
                }
            }  
        }
        const query_result = await esclient.search(query);
        console.log(query_result);
        data.result = query_result.aggregations;
        res.send(data);
    } catch(err) {
        console.error(err);
        res.status(500).send({ error: err });
    }

})
module.exports = router;