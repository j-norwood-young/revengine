import config from "config";
import JXPHelper from "jxp-helper";
import dotenv from "dotenv";
dotenv.config();
const jxphelper = new JXPHelper({ server: process.env.API_SERVER || config.api.server, apikey: process.env.APIKEY });
import moment from "moment-timezone";
moment.tz.setDefault(config.timezone || "UTC");
import esclient from "@revengine/common/esclient.js";

// Recency score
// Last week = 5
// Last 2 weeks = 4
// Last 4 weeks = 3
// Last 6 months (24 weeks) = 2
// Last year = 1
export default async function Recency(reader_id) {
    const reader = (await jxphelper.getOne("reader", reader_id)).data;
    let timestamps = [];
    const query = {
        index: "pageviews_copy",
        body: {
            "size": 1,
            "query": {
                "match": {
                    "user_id": reader.wordpress_id
                }
            },
            "sort": [
                {
                    "time": {
                        "order": "desc"
                    }
                }
            ]
        }
    }
    const es_result = await esclient.search(query);
    if (es_result.hits.hits.length) {
        timestamps.push(moment(es_result.hits.hits[0]._source.time));
    }
    const touchbasehits = (await jxphelper.aggregate("touchbaseevent", [
        {
            $match: {
                "email": reader.email
            }
        },
        {
            $sort: {
                timestamp: -1
            }
        },
        {
            $limit: 1
        }
    ]));
    if (touchbasehits.data.length) {
        timestamps.push(moment(touchbasehits.data[0].timestamp));
    }
    if (!timestamps.length) return false;
    const timestamp = moment.max(timestamps);
    const now = moment();
    const d = moment(timestamp);
    const weeks = now.diff(timestamp, "weeks");
    const from_now = d.fromNow("weeks");
    let score = 0;
    if (weeks === 0) {
        score = 5;
    } else if (weeks === 1) {
        score = 4;
    } else if (weeks < 4) {
        score = 3;
    } else if (weeks < 24) {
        score = 2;
    } else {
        score = 1;
    }
    return { timestamp, score, weeks, from_now };
}