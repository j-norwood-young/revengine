const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const jxphelper = new JXPHelper({ server: process.env.API_SERVER || config.api.server, apikey: process.env.APIKEY });
const moment = require("moment-timezone");
moment.tz.setDefault(config.timezone || "UTC");

const TopNewsletterSubscribers = async (days = 30, min_hits = 10, event = "clicks") => {
    const from_date = moment();
    from_date.subtract(days, "days");
    const query = [
        {
            "$match": {
                "event": event,
                "timestamp": {
                    $gte: `new Date(\"${from_date.toISOString()}\")`
                }
            }
        },
        // {
        //     "$limit": 100
        // },
        {
            "$group": {
                "_id": { "email": { "$toLower": "$email" } },
                "hit": { "$first": "$$ROOT" },
                "count": { "$sum": 1 }
            }
        },
        {
            "$match": {
                "count": { "$gte": min_hits }
            }
        },
        {
            "$lookup": {
                "from": "readers",
                "localField": "_id.email",
                "foreignField": "email",
                "as": "reader"
            }
        },
        {
            "$unwind": "$reader"
        },
        {
            "$project": {
                "email": "$_id.email",
                "count": 1,
                "wordpress_id": "$reader.wordpress_id",
                "wordpress_link": { "$concat": ["https://www.dailymaverick.co.za/wp-admin/user-edit.php?user_id=", { "$toString": "$reader.wordpress_id" }] },
                "revengine_link": { "$concat": [`${config.frontend.url}reader/view/`, { "$toString": "$reader._id" }] }
            }
        },
        {
            "$sort": {
                "count": -1
            }
        }
    ];
    const result = await jxphelper.aggregate("touchbaseevent", query, { allowDiskUse: true });

    return result;
}

const TopNewsletterSubscribersWithSubscriptions = async (days = 30, min_hits = 10, source = "touchbaseevent-clicks") => {
    const from_date = moment();
    from_date.subtract(days, "days");
    const query = [
        {
            "$match": {
                "source": source,
                "timestamp": {
                    $gte: `new Date(\"${from_date.toISOString()}\")`
                }
            }
        },
        // {
        //     "$limit": 100
        // },
        {
            "$group": {
                "_id": { "email": "$email" },
                "hit": { "$first": "$$ROOT" },
                "count": { "$sum": 1 }
            }
        },
        {
            "$match": {
                "count": { "$gte": min_hits }
            }
        },
        {
            "$lookup": {
                "from": "readers",
                "localField": "hit.reader_id",
                "foreignField": "_id",
                "as": "reader"
            }
        },
        {
            "$unwind": "$reader"
        },
        {
            "$project": {
                "_id": "$_id.email",
                "count": 1,
                "wordpress_id": "$reader.wordpress_id"
            }
        },
        {
            "$lookup": {
                "from": "woocommerce_subscriptions",
                "localField": "wordpress_id",
                "foreignField": "customer_id",
                "as": "subscription"
            }
        },
        {
            "$unwind": "$subscription"
        },
        {
            "$project": {
                "_id": 1,
                "count": 1,
                "wordpress_id": 1,
                "subscription_status": "$subscription.status",
                "susbcription_total": "$subscription.total",
                "subscription_period": "$subscription.billing_period",
                "subscription_date_created": "$subscription.date_created"
            }
        },
        {
            "$sort": {
                "subscription_date_created": 1
            }
        },
        {
            "$group": {
                "_id": "$_id",
                "doc": { "$last": "$$ROOT" }
            }
        },
        {
            "$replaceRoot": {
                "newRoot": "$doc"
            }
        },
        {
            "$sort": {
                "count": -1
            }
        }
    ];
    const result = await jxphelper.aggregate("hit", query, { allowDiskUse: true });
    return result;
}

module.exports = { TopNewsletterSubscribers, TopNewsletterSubscribersWithSubscriptions };