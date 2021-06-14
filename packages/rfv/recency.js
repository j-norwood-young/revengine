const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");
const ss = require("simple-statistics");

class Recency {
    constructor() {
        const start_date = new moment();
        start_date.subtract(config.rfv.days || 30, "days");
        this.start_date = start_date.toISOString();
    }

    calc_recency_score(last_hit) {
        const now = moment();
        const days = now.diff(last_hit, "days");
        let score = 0;
        if (days < 1) {
            score = 5;
        } else if (days < 8) {
            score = 4;
        } else if (days < 16) {
            score = 3;
        } else if (days < 22) {
            score = 2;
        } else if (days <= 30) {
            score = 1;
        } 
        return score;
    }

    async touchbase() {
        const r_pipeline = [
            { 
                $match: {
                    "timestamp": {
                        $gte: `new Date(\"${this.start_date}\")`
                    },
                    "event": "clicks",
                }
            },
            {
                $match: {
                    "url": {
                        "$regex": config.rfv.regex_url
                    }
                }
            },
            {
                $group: {
                    _id: { email: "$email" },
                    last_timestamp: { $last: "$timestamp" }
                }
            },
            {
                $project: {
                    "email": "$_id.email",
                    "last_timestamp": 1,
                    "_id": false
                }
            }
        ]
        console.log(JSON.stringify(r_pipeline, null, "   "))
        const recency_result = (await jxphelper.aggregate("touchbaseevent", r_pipeline, { allowDiskUse: true })).data.map(item => {
            return {
                email: item.email.toLowerCase(),
                recency: item.last_timestamp,
                recency_val: +new Date(item.last_timestamp),
                recency_score: this.calc_recency_score(item.last_timestamp)
            }
        });
        recency_result.sort((a, b) => a.recency_val - b.recency_val);
        const values = recency_result.map(a => a.recency);
        for (let recency of recency_result) {
            recency.recency_quantile_rank = ss.quantileRankSorted(values, recency.recency)
        }
        return recency_result;
    }
}

module.exports = Recency;