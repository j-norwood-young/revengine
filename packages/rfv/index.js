const config = require("config");
require("dotenv").config();
const moment = require("moment");
const JXPHelper = require('jxp-helper');
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const Reports = require("@revengine/reports");
const rfv = new Reports.RFV();
const cron = require("node-cron");
const Recency = require("./recency");
const Frequency = require("./frequency");
const Volume = require("./volume");

// # Calculating Frequency

// During the last thirty day period, how many days does the reader interact with our brand in any form?

// 1. Set all reader's frequency to null
// 2. Find all readers' unique hits on website for last 30 days in x seconds ago (ES)
// 3. Find all readers' unique hits and unique opens on Touchbase for last 30 days in x seconds ago (Mongo Pipeline)
// 4. Combine
// 5. Calculate percentile
// 6. Save to users
// 7. Use labels to calculate groups

const calc_frequency = async () => {
    try {
        // 1. Set all reader's frequency to null
        await jxphelper.put_all("reader", { frequency: null, frequency_score: 0, frequency_quantile_rank: null });
        const frequency = new Frequency();
        const touchbase_frequency = await frequency.touchbase();
        console.log(touchbase_frequency);
        const frequencies = [...touchbase_frequency];
        while (frequencies.length) {
            const result = await jxphelper.bulk_postput("reader", "email", frequencies.splice(0, 1000))
            // console.log(JSON.stringify(result.data, null, "\t"));
        }
    } catch(err) {
        console.error(err);
    }
}

// # Calculating Recency

// How long ago since the reader interacted with our brand in any form in 30 days?

// 1. Set all reader's recency to null
// 2. Find all readers' last seen on website for last 30 days in x seconds ago (ES)
// 3. Find all readers' last seen on Touchbase for last 30 days in x seconds ago (Mongo Pipeline)
// 4. Combine selecting lowest score
// 5. Calculate percentile
// 6. Save to users
// 7. Use labels to calculate groups

const calc_recency = async () => {
    try {
        const recency = new Recency;
        // 1. Set all reader's recency to null
        await jxphelper.put_all("reader", { recency: null, recency_score: 0, recency_quantile_rank: null });
        // 2. Find all readers' last seen on website for last 30 days in x seconds ago (ES)
        // 3. Find all readers' last seen on Touchbase for last 30 days in x seconds ago (Mongo Pipeline)
        const touchbase_recency = await recency.touchbase();
        // console.log(touchbase_recency);
        // 4. Combine selecting lowest score
        const recencies = [...touchbase_recency];
        // console.log(recencies);
        // 6. Save to users
        while (recencies.length) {
            const result = await jxphelper.bulk_postput("reader", "email", recencies.splice(0, 1000))
            console.log(JSON.stringify(result.data, null, "\t"));
        }
        // 7. Use labels to calculate groups

        console.log("Done");
    } catch(err) {
        console.error(err);
    }
}

const calc_volume = async () => {
    try {
        const volume = new Volume();
        const touchbase_volume = await volume.touchbase();
        console.log(touchbase_volume);
        const volumes = [...touchbase_volume];
        while (volumes.length) {
            const result = await jxphelper.bulk_postput("reader", "email", volumes.splice(0, 1000))
            console.log(JSON.stringify(result.data, null, "\t"));
        }
    } catch(err) {
        console.error(err);
    }
}

const schedule = "0 * * * *";

const main = async () => {
    try {
        await calc_recency();
        await calc_frequency();
        await calc_volume();
        console.log("rfv done");
    } catch(err) {
        console.error(err);
    }
}

cron.schedule(schedule, main);

main();