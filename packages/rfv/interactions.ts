import esclient from "@revengine/common/esclient"
import moment from "moment"
import apihelper from "@revengine/common/apihelper"
import { Command } from 'commander';
import cron from "node-cron";

const program = new Command();
program
    .option('-d, --daemon', 'run as a daemon on a cron schedule')
    .option('-c, --cron <cron>', 'override default cron schedule')
    .option('-h, --historical <day>', 'calculate historical values starting on day')
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
    count_by_service: {
        service: InteractionService;
        count: number;
    }[];
    count: number;
    insider: boolean;
    monthly_value: number;
};

enum InteractionService {
    WEB = "web",
    BOOKS = "books",
    MOBILE = "mobile",
    SAILTHRU_BLAST = "sailthru_blast",
    SAILTHRU_TRANSACTIONAL = "sailthru_transactional",
    TOUCHBASEPRO = "touchbasepro",
    QUICKET = "quicket",
}

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

async function get_es_interactions(mday: moment.Moment): Promise<TInteraction[]> {
    // Get ES interactions for yesterday
    const dateStart = mday.clone().startOf("day")
    const dateEnd = mday.clone().endOf("day")
    console.log(`Processing for ${mday.format("YYYY-MM-DD")}`);
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
            uid: `${reader._id}-${mday.format("YYYY-MM-DD")}`,
            day: mday.format("YYYY-MM-DD"),
            email: reader.email,
            reader_id: reader._id,
            count_by_service: [{
                service: InteractionService.WEB,
                count: bucket.doc_count,
            }],
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
                        $gte: mday.clone().startOf("day").format("YYYY-MM-DDTHH:mm:ss"),
                        $lte: mday.clone().endOf("day").format("YYYY-MM-DDTHH:mm:ss")
                    },
                },
            },
            {
                $group: {
                    _id: "$profile_id",
                    count: {
                        $sum: 1,
                    },
                },
            },
            {
                $lookup: {
                    from: "sailthru_profile",
                    localField: "_id",
                    foreignField: "id",
                    as: "profile",
                },
            },
            {
                $unwind: "$profile",
            },
            {
                $project: {
                    _id: 0,
                    count: 1,
                    profile: {
                        email: 1,
                        first_name: 1,
                        last_name: 1,
                        created: 1,
                        last_modified: 1,
                    },
                },
            },
            {
                $sort: {
                    count: -1,
                },
            },
        ];
        console.log(JSON.stringify(query, null, 2));
        const blast_messages = await apihelper.aggregate("sailthru_message_blast", query)
        console.log(blast_messages.data.slice(0, 10));
    } catch (error) {
        console.log(error);
    }
}

async function merge_services(services: any[]) {
    const result = [];
    for (let interactions of services) {
        for (let interaction of interactions) {
            const existing = result.find(x => x.uid === interaction.uid);
            if (existing) {
                existing.count_by_service.push(...interaction.count_by_service);
            } else {
                result.push(interaction);
            }
        }
        for (let interaction of result) {
            let count = 0;
            for (let service of Object.values(InteractionService)) {
                const service_count = interaction.count_by_service.find(x => x.service === service);
                if (service_count) {
                    count += service_count.count;
                }
                // if (!count) {
                //     interaction.count_by_service.push({
                //         service,
                //         count: 0,
                //     });
                // }
            }
            interaction.count = count;
        }
    }
    return result;
}


async function main(day: string | null = null) {
    console.log("Heating cache...");
    // await get_reader_cache();
    console.log("Getting interactions...");
    let mday: moment.Moment;
    if (!day) {
        mday = moment().subtract(1, "day");
    } else {
        mday = moment(day);
    }
    console.log(`Processing for ${mday.format("YYYY-MM-DD")}`);
    console.log("Getting Sailthru blast interactions...");
    await get_sailthru_blast_interactions(mday);
    // console.log("Getting ES interactions...");
    // const es_results = await get_es_interactions(mday);
    // console.log(es_results.slice(0, 10));
    // const interactions = await merge_services([es_results]);
    // console.log(interactions.slice(0, 10));
    
    // const result = await apihelper.bulk_postput("interaction", "uid", interactions);
    // console.log(result);
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