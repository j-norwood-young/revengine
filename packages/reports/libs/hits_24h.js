import config from "config";
import dotenv from "dotenv";
import moment from "moment-timezone";
import esclient from "@revengine/common/esclient.js";

dotenv.config();
moment.tz.setDefault(config.timezone || "UTC");

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

export default Hits24H;