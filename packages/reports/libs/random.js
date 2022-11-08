const config = require("config");
require("dotenv").config();
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");
const esclient = require("@revengine/common/esclient");

class Random {
    constructor(opts) {
        this.opts = Object.assign({
            size: 1,
            published_start_date: null,
            published_end_date: null,
            ignore_post_ids: [],
            jitter_factor: 10,
        }, opts || {});
    }

    async random_articles() {
        const query = {
            index: "pageviews_copy",
            body: {
                "size": 0,
                "query": {
                    "bool": {
                        "must": [
                            {
                                "exists": {
                                    "field": "article_id"
                                }
                            },
                        ],
                        "must_not": [
                            {
                                "terms": {
                                    "article_id": this.opts.ignore_post_ids
                                }
                            }
                        ]
                    }
                },
                "aggs": {
                    "result": {
                        "terms": {
                            "field": "article_id",
                            "size": this.opts.size * this.opts.jitter_factor,
                        }
                    }
                }
            }
        }
        if (this.opts.published_start_date) {
            query.body.query.bool.must.push({
                "range": {
                    "date_published": {
                        "gte": this.opts.published_start_date,
                    }
                }
            })
        }
        if (this.opts.published_end_date) {
            query.body.query.bool.must.push({
                "range": {
                    "date_published": {
                        "lt": this.opts.published_end_date,
                    }
                }
            })
        }
        // console.log(JSON.stringify(query, null, 2));
        const result = (await esclient.search(query)).aggregations.result.buckets;
        const articles = [];
        for (let i = 0; i < this.opts.size; i++) {
            // Select random item
            const random_index = Math.floor(Math.random() * result.length);
            articles.push(result.splice(random_index, 1)[0]);
        }
        return articles;
    }
}

module.exports = Random;