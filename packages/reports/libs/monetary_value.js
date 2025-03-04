// Combines recency, frequency, value in one step, and can handle multiple readers
const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const jxphelper = new JXPHelper({ server: process.env.API_SERVER || config.api.server, apikey: process.env.APIKEY });
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");

const calc_monetary_value_score = value => {
    let score = 0;
    if (value > 599) {
        score = 5;
    } else if (value > 299) {
        score = 4;
    } else if (value > 149) {
        score = 3;
    } else if (value > 75) {
        score = 2;
    } else if (value > 0) {
        score = 1;
    }
    return score;
}

const Monetary_Value = async () => {
    const mv_pipeline = [
        {
            $match: {
                "status": "active",
            }
        },
        {
            $addFields: {
                total_per_month: {
                    $cond: {
                        if: {
                            $eq: ["$billing_period", "year"]
                        },
                        then: {
                            $divide: ["$total", 12]
                        },
                        else: "$total"
                    }

                }
            }
        },
        {
            $match: {
                "total": { $gt: 0 }
            }
        },
        {
            $group: {
                _id: "$customer_id",
                total: { $sum: "$total" },
                billing_period: { $addToSet: "$billing_period" },
                total_per_month: { $sum: "$total_per_month" },
            }
        },
        {
            $unwind: "$billing_period"
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
                total_per_month: "$total_per_month",
                email: "$reader.email",
                reader_id: "$reader._id",
                billing_period: "$billing_period"
            }
        }
    ]
    const mv_hits = (await jxphelper.aggregate("woocommerce_subscription", mv_pipeline)).data;
    const readers = [];
    for (let hit of mv_hits) {
        if (!hit.reader_id) continue;
        const reader = { _id: hit.reader_id };
        const total = hit.total_per_month;
        reader.monetary_value_score = calc_monetary_value_score(total);
        reader.monetary_value = total;
        readers.push(reader);
    }
    // console.log(readers);
    return readers;
}

module.exports = Monetary_Value;