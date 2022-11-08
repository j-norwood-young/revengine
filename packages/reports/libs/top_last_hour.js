const config = require("config");
require("dotenv").config();
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");
const esclient = require("@revengine/common/esclient");

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
        const size = opts.size + 5;
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
            if (Array.isArray(opts.article_id)) {
                query.body.query.bool.must.push({
                    "terms": {
                        "article_id": opts.article_id
                    }
                });
            } else {
                query.body.query.bool.must.push({
                    "match": {
                        "article_id": opts.article_id
                    }
                })
            }
        }
        if (opts.section) {
            query.body.query.bool.must.push({
                "match": {
                    sections: opts.section
                }
            })
        }
        console.log(JSON.stringify(query, null, 2));
        const result = (await esclient.search(query)).aggregations.result.buckets;
        return result;
    }
}

module.exports = TopLastHour;