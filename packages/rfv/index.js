const config = require("config");
require("dotenv").config();
const moment = require("moment");
const JXPHelper = require('jxp-helper');
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const Reports = require("@revengine/reports");

const recency = async () => {
    try {
        const rfv = new Reports.RFV();
        const frequencies = (await rfv.calculate_frequencies()).map(frequency => {
            return {
                email: frequency.email,
                frequency_quantile_rank: frequency.quantile_rank
            }
        })
        // console.log(frequencies);
        while (frequencies.length) {
            const result = await jxphelper.bulk_postput("reader", "email", frequencies.splice(0, 1000))
            console.log(JSON.stringify(result.data, null, "\t"));
        }
    } catch(err) {
        console.error(err);
    }
}

try {
    recency();
} catch(err) {
    console.error(err);
}