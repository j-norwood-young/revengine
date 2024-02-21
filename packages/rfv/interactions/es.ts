import mongo from "@revengine/common/mongo"
import apihelper from "@revengine/common/apihelper"
import esclient from "@revengine/common/esclient"
import { TInteraction } from "./types";
let reader_cache = [];

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

export async function process_es_interactions(mday: moment.Moment) {
    await get_reader_cache();
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