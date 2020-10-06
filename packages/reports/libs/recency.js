const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");

// Recency score
// Last week = 5
// Last 2 weeks = 4
// Last 4 weeks = 3
// Last 6 months (24 weeks) = 2
// Last year = 1
const Recency = async (reader_id) => {
    const result = await jxphelper.get("hit", { "filter[reader_id]": reader_id, "order_by": "timestamp", "order_dir": -1, "limit": 1 });
    if (!result.count) return false;
    const timestamp = result.data[0].timestamp;
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

module.exports = Recency;