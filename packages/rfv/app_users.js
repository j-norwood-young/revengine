import esclient from "@revengine/common/esclient.js"
import mongo from "@revengine/common/mongo.js"

export class AppUsers {
    constructor(start_date, end_date) {
        this.start_date = start_date || new Date();
        // Default start_date to two days ago
        this.start_date.setDate(this.start_date.getDate() - 2);
        this.end_date = end_date || new Date();
        // Default end_date to yesterday
        this.end_date.setDate(this.end_date.getDate() - 1);
    }

    async run_query(after) {
        const user_ids = new Array();
        const query = {
            "size": 0,
            "query": {
                "bool": {
                    "filter": [
                        {
                            "match_phrase": {
                                "user_agent": "DM Mobile App"
                            }
                        },
                        {
                            "range": {
                                "time": {
                                    "format": "strict_date_optional_time",
                                    "gte": this.start_date,
                                    "lte": this.end_date
                                }
                            }
                        }
                    ]
                }
            },
            "aggs": {
                "unique_user_ids": {
                    "composite": {
                        "sources": [
                            {
                                "user_id": {
                                    "terms": {
                                        "field": "user_id"
                                    }
                                }
                            }
                        ],
                        "size": 1000
                    }
                }
            }
        }
        if (after) {
            query.aggs.unique_user_ids.composite.after = {
                "user_id": after
            }
        }
        const res = await esclient.search({
            index: "pageviews_copy",
            body: query
        });
        res.aggregations.unique_user_ids.buckets.forEach(bucket => {
            if (bucket.key.user_id) {
                user_ids.push(bucket.key.user_id);
            }
        });
        return user_ids;
    }

    async find_app_users_from_es() {
        let user_ids = new Set();
        let after = null;
        do {
            const res = await this.run_query(after);
            after = res.slice(-1)[0];
            user_ids = [...user_ids, ...res];
        } while (after);
        return user_ids;
    }
}

const app_users = new AppUsers();
const users = await app_users.find_app_users_from_es();
console.log(`Found ${users.length} app users`);

await mongo.updateMany("readers", { "wordpress_id": { "$in": users } }, { "$set": { "app_user": true } });

mongo.close();