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

const { Command } = require('commander');

const program = new Command();
program
    .option('-d, --daemon', 'run as a daemon on a cron schedule')
    .option('-c, --cron <cron>', 'override default cron schedule')
    .option('-h, --historical <date_start>', 'calculate historical values starting on date_start every week until now')
    .option('-i, --reader_ids', 'assign reader ids')
    ;

program.parse(process.argv);
const options = program.opts();

/*
How to export:
```
mongoexport -d revengine-prod -c rfvs -o ~/data/rfvs.csv --type csv --fields _id,date,reader_id,recency_score,recency,recency_quantile_rank,frequency_score,frequency,frequency_quantile_rank,volume_score,volume,volume_quantile_rank
sed -i 's/ObjectId(\([[:alnum:]]*\))/\1/g' ~/data/rfvs.csv
```

Importing into SQL
```
mysql revengine -e "LOAD DATA LOCAL INFILE '/root/data/rfvs.csv' INTO TABLE rfvs FIELDS TERMINATED BY ',' ENCLOSED BY '\"' LINES TERMINATED BY '\n' IGNORE 1 ROWS"
```
*/
// # Calculating Frequency

// During the last thirty day period, how many days does the reader interact with our brand in any form?

// 1. Set all reader's frequency to null
// 2. Find all readers' unique hits on website for last 30 days in x seconds ago (ES)
// 3. Find all readers' unique hits and unique opens on Touchbase for last 30 days in x seconds ago (Mongo Pipeline)
// 4. Combine
// 5. Calculate percentile
// 6. Save to users
// 7. Use labels to calculate groups

const save_rfv = (data) => {
    try {
        const update = data.map(item => {
            return {
                "updateOne": {
                    "upsert": true,
                    "update": item,
                    "filter": {
                        "date": item.date,
                        "email": item.email
                    }
                }
            }
        })
        return jxphelper.bulk("rfv", update);
    } catch(err) {
        throw(err);
    }
}

const calc_frequency = async (date) => {
    console.time("calc_frequency");
    try {
        // 1. Set all reader's frequency to null
        // await jxphelper.put_all("reader", { frequency: null, frequency_score: 0, frequency_quantile_rank: null });
        const frequency = new Frequency(date);
        const touchbase_frequency = await frequency.touchbase();
        // console.log(touchbase_frequency);
        const frequencies = [...touchbase_frequency];
        while (frequencies.length) {
            const result = await save_rfv(frequencies.splice(0, 1000));
            // const result = await jxphelper.bulk_postput("reader", "email", frequencies.splice(0, 1000))
            // console.log(JSON.stringify(result.data, null, "\t"));
        }
    } catch(err) {
        console.error(err);
    }
    console.timeEnd("calc_frequency");
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

const calc_recency = async (date) => {
    console.time("calc_recency");
    try {
        console.log("Fetching recency data");
        const recency = new Recency(date);
        // 1. Set all reader's recency to null
        // await jxphelper.put_all("reader", { recency: null, recency_score: 0, recency_quantile_rank: null });
        // 2. Find all readers' last seen on website for last 30 days in x seconds ago (ES)
        // 3. Find all readers' last seen on Touchbase for last 30 days in x seconds ago (Mongo Pipeline)
        const touchbase_recency = await recency.touchbase();
        console.log("Got recency data");
        // console.log(touchbase_recency);
        // 4. Combine selecting lowest score
        const recencies = [...touchbase_recency];
        // console.log(recencies);
        // 6. Save to users
        while (recencies.length) {
            console.log(recencies.length);
            const result = await save_rfv(recencies.splice(0, 1000));
            // const result = await jxphelper.bulk_postput("reader", "email", recencies.splice(0, 1000))
            // console.log(JSON.stringify(result.data, null, "\t"));
        }
        // 7. Use labels to calculate groups
    } catch(err) {
        console.error(err);
    }
    console.timeEnd("calc_recency");
}

const calc_volume = async (date) => {
    console.time("calc_volume");
    try {
        const volume = new Volume(date);
        const touchbase_volume = await volume.touchbase();
        // console.log(touchbase_volume);
        const volumes = [...touchbase_volume];
        while (volumes.length) {
            const result = await save_rfv(volumes.splice(0, 1000));
            // const result = await jxphelper.bulk_postput("reader", "email", volumes.splice(0, 1000))
            // console.log(JSON.stringify(result.data, null, "\t"));
        }
    } catch(err) {
        console.error(err);
    }
    console.timeEnd("calc_volume");
}

const schedule = "0 22 * * 1";

const main = async () => {
    try {
        const date = moment().startOf("day");
        await calc_recency(date);
        await calc_frequency(date);
        await calc_volume(date);
        await assign_reader_ids();
        console.log(`rfv ${date.format("YYYY-MM-DD")} done`);
    } catch(err) {
        console.error(err);
    }
}

const historical = async(start_date) => {
    try {
        let date = moment(new Date(start_date || "2021-01-01"));
        while (date < new Date()) {
            console.log(date);
            await calc_recency(date);
            await calc_frequency(date);
            await calc_volume(date);
            date.add(1, "week"); //Add a week
        }
        await assign_reader_ids();
        console.log("historical rfv done");
    } catch(err) {
        console.error(err);
    }
}

const assign_reader_ids = async() => {
    try {
        const readers = (await jxphelper.get("reader", { "fields": "email" })).data.filter(reader => (reader.email));
        console.log(`Sycing ${readers.length} emails...`)
        while(readers.length) {
            const query = readers.splice(0,1000).map(reader => {
                return {
                    "updateMany": {
                        "update": { reader_id: reader._id },
                        "filter": { email: reader.email, reader_id: { $exists: false } }
                    }
                }
            })
            const result = await jxphelper.bulk("rfv", query);
        }
    } catch(err) {
        console.error(err);
    }
}

if (options.daemon) {
    cron.schedule(schedule, main);
} else if (options.historical) {
    historical(options.historical);
} else if (options.reader_ids) {
    assign_reader_ids()
} else {
    main()
}