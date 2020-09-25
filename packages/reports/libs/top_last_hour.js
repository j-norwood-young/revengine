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

    async run() {
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
                            "size": 40,
                        }
                    }
                }
            }
        }
        const result = await esclient.search(query);
        // console.log(result.aggregations.result);
        return result.aggregations.result.buckets;
    }
}

module.exports = TopLastHour;