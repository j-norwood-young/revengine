const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");
const elasticsearch = require("elasticsearch")
const esclient = new elasticsearch.Client({
    host: config.elasticsearch.server,
});

class Hits24H {
    constructor(opts) {
        opts = Object.assign(opts || {}, {
            // Defaults here
        });
    }

    async run(interval) {
        interval = interval || "minute";
        const query = {
            index: "pageviews_copy",
            body: {
                "aggs": {
                    "result": {
                        "date_histogram": {
                            "field": "time",
                            "interval": interval
                        }
                    }
                },
                "size": 0,
                "docvalue_fields": [
                    {
                        "field": "time",
                        "format": "date_time",
                    }
                ],
                "query": {
                    "bool": {
                        "must": [
                            {
                                "range": {
                                    "time": {
                                        "lt": "now-1h/h",
                                        "gte": "now-25h/h",
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        }
        const result = await esclient.search(query);
        // console.log(result.aggregations.result);
        return result.aggregations.result.buckets;
    }
}

module.exports = Hits24H;