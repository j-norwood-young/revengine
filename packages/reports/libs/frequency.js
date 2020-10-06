const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");

// Frequency score
// 100 = 5
// 50 = 4
// 25 = 3
// 10 = 2
// 1 = 1
const Frequency = async (reader_id) => {
    const six_months_ago = moment().subtract(6, "months");
    const result = await jxphelper.get("hit", { "filter[reader_id]": reader_id, "limit": 1, "filter[timestamp]": `$gte:${six_months_ago.toDate()}` });
    const count = result.count;
    
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
    return { count, score };
}

module.exports = Frequency;