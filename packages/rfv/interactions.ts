
import moment from "moment"
import mongo from "@revengine/common/mongo"
import { Command } from 'commander';
import cron from "node-cron";
import { process_sailthru_blast_interactions } from "./interactions/sailthru";
import { process_es_interactions } from "./interactions/es";
import { process_memberships } from "./interactions/membership";

const program = new Command();
program
    .option('--daemon', 'run as a daemon on a cron schedule')
    .option('-c, --cron <cron>', 'override default cron schedule')
    .option('-d, --day <day>', 'calculate values for day')
    .option('-s, --start <day>', 'start date for historical calculation')
    .option('-e, --end <day>', 'end date for historical calculation')
    .option('-a, --all', 'calculate all interactions')
    .option('-i, --interactions <interactions>', 'calculate specific interactions')
    ;

program.parse(process.argv);
const options = program.opts();

const schedule = "4 0 * * *";

async function calculate_count(mday: moment.Moment) {
    // console.log("Calculating count...");
    await mongo.updateMany("interactions", { day: mday.format("YYYY-MM-DD") }, 
        [
          {
            $set: {
              count: {
                $add: [
                    { $ifNull: ["$web_count", 0] },
                    { $ifNull: ["$sailthru_blast_open_count", 0] },
                    { $ifNull: ["$sailthru_blast_click_count", 0] },
                    { $ifNull: ["$sailthru_transactional_open_count", 0] },
                    { $ifNull: ["$sailthru_transactional_click_count", 0] },
                    { $ifNull: ["$touchbasepro_open_count", 0] },
                    { $ifNull: ["$quicket_open_count", 0] },
                ]
              }
            }
          }
        ]
    );
    await mongo.close();
}

async function interactions(day: string | null = null) {
    console.time("interactions");
    let mday: moment.Moment;
    if (!day) {
        mday = moment().subtract(1, "day");
    } else {
        mday = moment(day);
    }
    let run_all = options.all || !options.interactions;
    console.log(`Processing for ${mday.format("YYYY-MM-DD")}`);

    if (run_all || options.interactions === "sailthru") {
        console.log("Getting Sailthru blast interactions...");
        await process_sailthru_blast_interactions(mday);
        console.log("Getting ES interactions...");
    }

    if (run_all || options.interactions === "es") {
        await process_es_interactions(mday);
        console.log("Calculating count...");
    }

    if (run_all || options.interactions === "membership") {
        await process_memberships(mday);
    }

    await calculate_count(mday);
    console.timeEnd("interactions");
}

async function runBetweenDates(start_date, end_date) {
    const start = moment(start_date);
    const end = moment(end_date);
    let day = start.clone();
    while (day.isSameOrBefore(end)) {
        await interactions(day.format("YYYY-MM-DD"));
        day.add(1, "day");
    }
}

if (options.daemon) {
    cron.schedule(schedule, interactions);
} else if (options.day) {
    interactions(options.day);
} else if (options.start && options.end) {
    runBetweenDates(options.start, options.end);
} else {
    interactions()
}