const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");
const elasticsearch = require("elasticsearch")
const esclient = new elasticsearch.Client({
    host: config.elasticsearch.server,
});

class TopLastHour {
    constructor(opts) {
        opts = Object.assign(opts || {}, {
            // Defaults here
        });
    }

    async run(opts) {
        opts = Object.assign({
            size: 40,
            article_id: null,
            section: null
        }, opts);
        const size = opts.size + 2;
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
                            {
                                "range": {
                                    "time": {
                                        "lt": "now",
                                        "gte": "now-60m/m",
                                        // "time_zone": "+02:00"
                                    }
                                }
                            }
                        ]
                    }
                },
                "aggs": {
                    "result": {
                        "terms": {
                            "field": "article_id",
                            "size": size,
                        }
                    }
                }
            }
        }
        if (opts.article_id) {
            query.body.query.bool.must.push({
                "match": {
                    article_id: opts.article_id
                }
            })
        }
        if (opts.section) {
            query.body.query.bool.must.push({
                "match": {
                    sections: opts.section
                }
            })
        }
        const result = await esclient.search(query);
        // console.log(result.aggregations.result);
        return result.aggregations.result.buckets.slice(0, size - 1);
    }
}

module.exports = TopLastHour;