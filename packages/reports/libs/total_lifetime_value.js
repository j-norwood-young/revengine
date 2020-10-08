// Combines recency, frequency, value in one step, and can handle multiple readers
const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");

const calc_total_lifetime_value_score = value => {
    let score = 0;
    if (value > 10000) {
        score = 5;
    } else if (value > 5000) {
        score = 4;
    } else if (value > 1000) {
        score = 3;
    } else if (value > 500) {
        score = 2;
    } else if (value > 0) {
        score = 1;
    }
    return score;
}

const Total_Lifetime_Value = async () => {
    const tlv_pipeline = [
        {
            $match: {
                "date_paid": { $exists: true },
                "total": { $gt: 0 }
            }
        },
        {
            $group: {
                _id: "$customer_id",
                total: { $sum: "$total" },
            }
        },
        {
            $lookup: {
                from: "readers",
                localField: "_id",
                foreignField: "id",
                as: "reader"
            }
        },
        {
            $unwind: "$reader"
        },
        {
            $project: {
                _id: "$_id",
                total: "$total",
                email: "$reader.email",
                reader_id: "$reader._id"
            }
        }
    ]
    const tlv_hits = (await jxphelper.aggregate("woocommerce_order", tlv_pipeline)).data;
    const readers = [];
    for (let hit of tlv_hits) {
        if (!hit.reader_id) continue;
        const reader = { _id: hit.reader_id };
        reader.total_lifetime_value_score = calc_total_lifetime_value_score(hit.total);
        reader.total_lifetime_value = hit.total;
        readers.push(reader);
    }
    // console.log(readers);
    return readers;
}

module.exports = Total_Lifetime_Value;