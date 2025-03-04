const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const jxphelper = new JXPHelper({ server: process.env.API_SERVER || config.api.server, apikey: process.env.APIKEY });
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");
const ss = require("simple-statistics");

class Volume {
    constructor(date) {
        const moment_date = date ? new moment(date) : new moment();
        this.end_date = moment_date.toISOString();
        moment_date.subtract(config.rfv.days || 30, "days");
        this.date = moment_date.toISOString();
    }

    calc_volume_score(vol) {
        let score = 0;
        if (vol > 100) {
            score = 5;
        } else if (vol > 75) {
            score = 4;
        } else if (vol > 50) {
            score = 3;
        } else if (vol > 25) {
            score = 2;
        } else if (vol > 1) {
            score = 1;
        }
        return score;
    }

    async touchbase() {
        const f_pipeline = [
            {
                $match: {
                    "timestamp": {
                        $gte: `new Date(\"${this.date}\")`,
                        $lt: `new Date(\"${this.end_date}\")`
                    },
                    "event": "opens",
                }
            },
            {
                $group: {
                    _id: { email: "$email", campaign_id: "$campaign_id" }
                }
            },
            {
                $group: {
                    _id: { email: "$_id.email" },
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
        const volume_results = (await jxphelper.aggregate("touchbaseevent", f_pipeline, { allowDiskUse: true })).data.map(item => {
            return {
                email: item.email.toLowerCase(),
                volume: item.count,
                volume_score: this.calc_volume_score(item.count),
                date: this.end_date
            }
        });
        volume_results.sort((a, b) => a.volume - b.volume);
        const values = volume_results.map(a => a.volume);
        for (let volume of volume_results) {
            volume.volume_quantile_rank = ss.quantileRankSorted(values, volume.volume)
        }
        return volume_results;
    }
}

module.exports = Volume;