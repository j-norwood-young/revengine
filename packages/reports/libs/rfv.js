// Combines recency, frequency, value in one step, and can handle multiple readers
const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");

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

const RFV = async () => {
    const rv_pipeline = [
        {
            $group: {
                _id: { email: "$email" },
                last: { $last: "$timestamp" },
                count: { $sum: 1 }
            }
        }
    ]
    const rv_hits = (await jxphelper.aggregate("hit", rv_pipeline)).data;
    // We should limit the timestamp to last x months
    const f_pipeline = [
        {
            $sort: {
                email: 1
            }
        },
        {
            $group: {
                _id: { email: "$email", dow: { $dayOfWeek: "$timestamp" } },
            }
        },
        {
            $group: {
                _id: "$_id.email",
                dow: { $push: "$_id.dow" },
                count: { $sum: 1 }
            }
        }
    ]
    const f_hits = (await jxphelper.aggregate("hit", f_pipeline)).data;
    const readers = [];
    for (let hit of rv_hits) {
        if (!hit._id.email) continue;
        const reader = { email: hit._id.email };
        if (hit.reader_id) reader._id = hit.reader_id;
        reader.recency_score = calc_recency_score(hit.last);
        reader.recency = hit.last;
        reader.volume_score = calc_volume_score(hit.count);
        reader.volume = hit.count;
        reader.frequency_score = 0;
        reader.frequency = 0;
        const f_hit = f_hits.find(f_hit => f_hit._id === hit._id.email);
        if (f_hit) {
            reader.frequency_score = calc_frequency_score(f_hit.count);
            reader.frequency = f_hit.count;
        }
        readers.push(reader);
    }
    return readers;
}

module.exports = RFV;