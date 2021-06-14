const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");
const ss = require("simple-statistics");

class Frequency {
    constructor() {
        const start_date = new moment();
        start_date.subtract(config.rfv.days || 30, "days");
        this.start_date = start_date.toISOString();
    }

    calc_frequency_score(freq) {
        let score = 0;
        if (freq > 20) {
            score = 5;
        } else if (freq > 15) {
            score = 4;
        } else if (freq > 10) {
            score = 3;
        } else if (freq > 5) {
            score = 2;
        } else if (freq > 1) {
            score = 1;
        } 
        return score;
    }

    async touchbase() {
        const f_pipeline = [
            { 
                $match: {
                    "timestamp": {
                        $gte: `new Date(\"${this.start_date}\")`
                    },
                    // "event": "opens",
                }
            },
            {
                $group: {
                    _id: { 
                        email: "$email",
                        date: {
                            "$dateToString": {
                                "format": "%Y-%m-%d",
                                "date": "$timestamp"
                            }
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    "email": "$_id.email",
                    "count": 1,
                    "_id": false
                }
            }
        ]
        // console.log(JSON.stringify(f_pipeline, null, "   "));
        const frequency_results = (await jxphelper.aggregate("touchbaseevent", f_pipeline, { allowDiskUse: true })).data.map(item => {
            return {
                email: item.email.toLowerCase(),
                frequency: item.count,
                frequency_score: this.calc_frequency_score(item.count)
            }
        });
        frequency_results.sort((a, b) => a.frequency - b.frequency);
        const values = frequency_results.map(a => a.frequency);
        for (let frequency of frequency_results) {
            frequency.frequency_quantile_rank = ss.quantileRankSorted(values, frequency.frequency)
        }
        return frequency_results;
    }
}

module.exports = Frequency;