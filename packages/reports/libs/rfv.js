// Combines recency, frequency, value in one step, and can handle multiple readers
const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const jxphelper = new JXPHelper({ server: process.env.API_SERVER || config.api.server, apikey: process.env.APIKEY });
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");
const ss = require("simple-statistics");

const calc_recency_score = last_hit => {
    const now = moment();
    const weeks = now.diff(last_hit, "weeks");
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
    return score;
}

const calc_volume_score = count => {
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
    return score;
}

const calc_frequency_score = count => {
    let score = 0;
    if (count > 4) {
        score = 5;
    } else if (count > 3) {
        score = 4;
    } else if (count > 2) {
        score = 3;
    } else if (count > 1) {
        score = 2;
    } else if (count > 0) {
        score = 1;
    }
    return score;
}

const calc_monetary_value_score = value => {
    const score = 0;
    if (value > 599) {
        score = 5;
    } else if (value > 299) {
        score = 4;
    } else if (value > 149) {
        score = 3;
    } else if (value > 50) {
        score = 2;
    } else if (value > 0) {
        score = 1;
    }
    return score;
}

class RFV {
    constructor() {
        const d30_date = new Date();
        d30_date.setDate(d30_date.getDate() - 30);
        this.d30 = d30_date.toISOString();
        const y1_date = new Date();
        y1_date.setDate(y1_date.getDate() - 30);
        this.y1 = y1_date.toISOString();
    }

    // How many times has this reader clicked on a link in the last 30 days?
    async calculate_frequencies() {
        const f_pipeline = [
            {
                $match: {
                    "timestamp": {
                        $gte: `new Date(\"${this.d30}\")`
                    },
                    "event": "clicks",
                }
            },
            {
                $match: {
                    "url": {
                        "$regex": "dailymaverick.co.za"
                    }
                }
            },
            {
                $project: {
                    "email": "$email",
                    "timestamp": "$timestamp",
                    // "day_of_week": { $dayOfWeek: "$timestamp" },
                    // "day_of_month": { $dayOfMonth: "$timestamp" },
                    "day_of_year": { $dayOfYear: "$timestamp" },
                }
            },
            {
                $group: {
                    _id: { email: "$email", day_of_year: "$day_of_year" },
                }
            },
            {
                $group: {
                    _id: { email: "$_id.email" },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: {
                    "count": -1
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
        const frequency_result = (await jxphelper.aggregate("touchbaseevent", f_pipeline)).data;
        frequency_result.sort((a, b) => b.count - a.count);
        const values = frequency_result.map(a => a.count).sort((a, b) => a - b);
        for (let frequency of frequency_result) {
            frequency.email = frequency.email.toLowerCase();
            frequency.quantile_rank = ss.quantileRankSorted(values, frequency.count)
        }
        return frequency_result;
    }

    async calculate_recencies() {
        const r_pipeline = [
            {
                $match: {
                    "timestamp": {
                        $gte: `new Date(\"${this.y1}\")`
                    },
                    "event": "clicks",
                }
            },
            {
                $match: {
                    "url": {
                        "$regex": "dailymaverick.co.za"
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
        const recency_result = (await jxphelper.aggregate("touchbaseevent", r_pipeline, { allowDiskUse: true })).data.map(item => {
            return {
                email: item.email.toLowerCase(),
                recency: Math.round((new Date() - new Date(item.last_timestamp)) / (-1000)),
                last_timestamp: item.last_timestamp
            }
        });
        recency_result.sort((a, b) => a.recency - b.recency)
        const values = recency_result.map(a => a.recency);
        // console.log(values.length);
        for (let recency of recency_result) {
            recency.quantile_rank = ss.quantileRankSorted(values, recency.recency)
        }
        return recency_result;
    }

    async calculate_volumes() {
        const v_pipeline = [
            {
                $match: {
                    "timestamp": {
                        $gte: `new Date(\"${this.d30}\")`
                    },
                    "event": "clicks",
                }
            },
            {
                $match: {
                    "url": {
                        "$regex": "dailymaverick.co.za"
                    }
                }
            },
            {
                $group: {
                    _id: { email: "$email", url: "$url" },
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
        const volume_result = (await jxphelper.aggregate("touchbaseevent", v_pipeline)).data;
        volume_result.sort((a, b) => b.count - a.count);
        const values = volume_result.map(a => a.count).sort((a, b) => a - b);
        for (let volume of volume_result) {
            volume.email = volume.email.toLowerCase();
            volume.quantile_rank = ss.quantileRankSorted(values, volume.count)
        }
        return volume_result;
    }
}

module.exports = RFV;