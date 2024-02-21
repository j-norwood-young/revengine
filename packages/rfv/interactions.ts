import esclient from "@revengine/common/esclient"
import moment from "moment"
import apihelper from "@revengine/common/apihelper"
import mongo from "@revengine/common/mongo"
import { Command } from 'commander';
import cron from "node-cron";

const program = new Command();
program
    .option('-d, --daemon', 'run as a daemon on a cron schedule')
    .option('-c, --cron <cron>', 'override default cron schedule')
    .option('-d, --day <day>', 'calculate values for day')
    .option('-s, --start <day>', 'start date for historical calculation')
    .option('-e, --end <day>', 'end date for historical calculation')
    ;

program.parse(process.argv);
const options = program.opts();

const schedule = "4 0 * * *";

let reader_cache = [];

type TInteraction = {
    uid: string;
    day: Date;
    email: string;
    reader_id: string;
    web_count: number;
    sailthru_blast_open_count: number;
    sailthru_blast_click_count: number;
    sailthru_transactional_open_count: number;
    sailthru_transactional_click_count: number;
    touchbasepro_open_count: number;
    quicket_open_count: number;
    count: number;
    insider: boolean;
    monthly_value: number;
};

async function get_reader_cache() {
    if (reader_cache.length === 0) {
        const readers = await apihelper.aggregate("reader", [{
            $project: {
                _id: 1,
                wordpress_id: 1,
                email: 1,
            },
        }]);
        reader_cache = readers.data;
    }
    return reader_cache;
}

async function process_es_interactions(mday: moment.Moment) {
    const interactions = await get_es_interactions(mday);
    // console.log(JSON.stringify(interactions.slice(0, 10), null, 2));
    // Write to temp mongo collection
    const tmp_collection = `es_interactions_${mday.format("YYYYMMDD")}`;
    if (await mongo.collectionExists(tmp_collection)) {
        await mongo.dropCollection(tmp_collection);
    }
    await mongo.insertMany(tmp_collection, interactions);
    // Merge with existing interactions
    const merge_query = [
        {
            $project: {
                _id: 0,
                uid: 1,
                day: 1,
                email: 1,
                reader_id: 1,
                web_count: 1
            }
        },
        {
            $merge: {
                into: "interactions",
                on: "uid",
                whenMatched: "merge",
                whenNotMatched: "insert",
            }
        }
    ];
    await mongo.aggregate(tmp_collection, merge_query);
    await mongo.close();
}

async function get_es_interactions(mday: moment.Moment): Promise<TInteraction[]> {
    // Get ES interactions for yesterday
    const dateStart = mday.clone().startOf("day")
    const dateEnd = mday.clone().endOf("day")
    // console.log(`Processing web interactions for ${dateStart.toISOString()} to ${dateEnd.toISOString()}`);
    const query = {
        index: "pageviews_copy",
        size: 0,
        body: {
            query: {
                bool: {
                    filter: [
                        { 
                            range: { 
                                time: { 
                                    gte: dateStart.toISOString(),
                                    lte: dateEnd.toISOString()
                                } 
                            } 
                        },
                        // Must have user_id set and not null
                        { 
                            exists: { 
                                field: "user_id" 
                            }
                        },
                        // Must have article_id set and not null
                        { 
                            exists: { 
                                field: "article_id" 
                            }
                        },
                        // Action must be "pageview"
                        { 
                            term: { 
                                action: "pageview" 
                            } 
                        },
                    ],
                },
            },
        },
        "aggs": {
            "users": {
                "terms": {
                    "field": "user_id",
                    "order": {
                        "_count": "desc"
                    },
                    "size": 5000
                }
            }
        }
    }
    // console.log(JSON.stringify(query, null, 2))
    const hits = await esclient.search<TInteraction>(query)
    const result = hits.aggregations?.users.buckets.map(bucket => {
        const reader = reader_cache.find(reader => reader.wordpress_id === bucket.key);
        if (!reader) {
            console.log(`Could not find reader ${bucket.key}`);
            return null;
        }
        return {
            uid: `${reader.email}-${mday.format("YYYY-MM-DD")}`,
            day: mday.format("YYYY-MM-DD"),
            email: reader.email,
            reader_id: reader._id,
            web_count: bucket.doc_count,
        }
    }).filter(x => x !== null);
    return result;
}

async function get_sailthru_blast_interactions(mday: moment.Moment){
    try {
        const query = [
            {
                $match: {
                    open_time: {
                        $gte: `new Date(\"${mday.clone().startOf("day").format("YYYY-MM-DDTHH:mm:ss")}\")`,
                        $lte: `new Date(\"${mday.clone().endOf("day").format("YYYY-MM-DDTHH:mm:ss")}\")`
                    },
                },
            },
            {
                $lookup: {
                    from: "sailthru_profile",
                    localField: "profile_id",
                    foreignField: "id",
                    as: "profile",
                },
            },
            {
                $unwind: "$profile",
            },
            {
                $group: {
                    _id: {
                        email: "$profile.email", 
                        day: {
                            $dateToString: {
                                date: "$open_time",
                                format: "%Y-%m-%d",
                            }
                        }
                    },
                    count: {
                        $sum: 1,
                    },
                    // open_time: {
                    //     $first: {
                    //         open_time: "$open_time",
                    //     }
                    // }
                },
            },
            {
                $lookup: {
                    from: "readers",
                    localField: "_id.email",
                    foreignField: "email",
                    as: "reader",
                }
            },
            {
                $unwind: "$reader",
            },
            {
                $project: {
                    _id: 0,
                    uid: {
                        $concat: ["$_id.email", "-", "$_id.day"]
                    },
                    day: {
                        $dateFromString: {
                            dateString: "$_id.day",
                            format: "%Y-%m-%d",
                        }
                    },
                    reader_id: "$reader._id",
                    email: "$_id.email",
                    sailthru_blast_open_count: "$count",
                },
            },
            // {
            //     $sort: {
            //         "sailthru_blast_open_count": -1,
            //     },
            // },
            {
                $merge: {
                    into: "interactions",
                    on: "uid",
                    whenMatched: "merge",
                    whenNotMatched: "insert",
                },
            }
        ];
        // console.log(JSON.stringify(query, null, 2));
        const blast_messages = await apihelper.aggregate("sailthru_message_blast", query)
        // console.log(blast_messages.data.slice(0, 10));
    } catch (error) {
        console.log(error);
    }
}

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


async function main(day: string | null = null) {
    console.log("Heating cache...");
    await get_reader_cache();
    let mday: moment.Moment;
    if (!day) {
        mday = moment().subtract(1, "day");
    } else {
        mday = moment(day);
    }
    console.log(`Processing for ${mday.format("YYYY-MM-DD")}`);
    console.log("Getting Sailthru blast interactions...");
    await get_sailthru_blast_interactions(mday);
    console.log("Getting ES interactions...");
    await process_es_interactions(mday);
    console.log("Calculating count...");
    await calculate_count(mday);
}

async function runBetweenDates(start_date, end_date) {
    const start = moment(start_date);
    const end = moment(end_date);
    let day = start.clone();
    while (day.isSameOrBefore(end)) {
        await main(day.format("YYYY-MM-DD"));
        day.add(1, "day");
    }
}

if (options.daemon) {
    cron.schedule(schedule, main);
} else if (options.historical) {
    main(options.historical);
} else if (options.start && options.end) {
    runBetweenDates(options.start, options.end);
} else {
    main()
}