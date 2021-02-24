const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");

// Value score
// Last week = 5
// Last 2 weeks = 4
// Last 4 weeks = 3
// Last 6 months (24 weeks) = 2
// Last year = 1
const Value = async (reader_id) => {
    const reader = (await jxphelper.getOne("reader", reader_id, { "fields": "wordpress_id"})).data;
    if (!reader.wordpress_id) return false;
    const subscription_result = await jxphelper.get("woocommerce_subscription", { "filter[customer_id]": reader.wordpress_id, "filter[status]": "active", "order_by": "timestamp", "order_dir": -1, "limit": 1 });
    if (!subscription_result.count) return false;
    const value = subscription_result.data.reduce((prev, curr) => {
        if (curr.billing_period === "year") return prev + (curr.total / 12);
        return prev + curr.total;
    }, 0);
    let score = 0;
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
    return { score, value };
}

module.exports = Value;