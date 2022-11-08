const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");
const esclient = require("@revengine/common/esclient");

// Frequency score
// 100 = 5
// 50 = 4
// 25 = 3
// 10 = 2
// 1 = 1
const Frequency = async (reader_id, months = 3) => {
    
    const months_ago = moment().subtract(months, "months");
    // ES
    const reader = (await jxphelper.getOne("reader", reader_id)).data;
    let hits = 0;
    const query = {
        index: "pageviews_copy",
        body: {
            "size": 0,
            "query": {
                "bool": {
                    "must": [
                        {
                            "match": {
                                "user_id": reader.wordpress_id
                            }
                        },
                        {
                            "range": {
                                "time": {
                                    "lt": "now",
                                    "gte": `now-${months}M/M`
                                }
                            }
                        }
                    ]
                }
            }
        }
    }
    const es_result = await esclient.search(query);
    hits += es_result.hits.total;
    // Touchbase
    const touchbasehits = (await jxphelper.aggregate("touchbaseevent", [
        {
            $match: {
                "timestamp": {
                    $gte: `new Date(\"${months_ago.toISOString()}\")`
                },
                "email": reader.email
            }
        },
        {
            $count: "count"
        }
    ]));
    hits += (touchbasehits.data.length) ? touchbasehits.data[0].count : 0;
    const count = hits;
    let score = 0;
    if (count > 100) {
        score = 5;
    } else if (count > 50) {
        score = 4;
    } else if (count > 25) {
        score = 3;
    } else if (count > 10) {
        score = 2;
    } else if (count > 0) {
        score = 1;
    }
    return { count, score };
}

module.exports = Frequency;