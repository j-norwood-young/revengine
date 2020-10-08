const config = require("config");
require("dotenv").config();
const JXPHelper = require("jxp-helper");
const apihelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const moment = require("moment");
const elasticsearch = require("@elastic/elasticsearch");
const esclient = new elasticsearch.Client({
    node: config.elasticsearch.node
});
const crypto = require("crypto");
const { url } = require("inspector");
const RFV = require("@revengine/reports/libs/rfv");
const Favourites = require("@revengine/reports/libs/favourites");
const Monetary_Value = require("@revengine/reports/libs/monetary_value");
const Total_Lifetime_Value = require("@revengine/reports/libs/total_lifetime_value");

const md5 = input => {
    return crypto.createHash('md5').update(input).digest("hex");
}

// Aggregates opens and clicks into daily buckets that it saves with the user
const consolidate_touchbase_events = async () => {
    try {
        const readers = (await apihelper.get("reader", { fields: "email,touchbase_events" })).data;
        for (let reader of readers) {
            if (!reader.email) continue;
            const email = reader.email.toLowerCase();
            const query = [
                {
                    "$match": {
                        email,
                    },
                },
                { 
                    $group: { 
                        _id: { 
                            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } 
            }];
            const result = await apihelper.aggregate("touchbaseevent", query);
            if (!result.data.length) continue;
            const touchbase_events = result.data.map(event => {
                return {
                    date: event._id,
                    count: event.count
                }
            });
            let update = false;
            if (!reader.touchbase_events) {
                update = true;
            } else {
                for (let event of touchbase_events) {
                    let match_event = reader.touchbase_events.find(ev => (ev.date === event.date) && (ev.count === event.count));
                    if (!match_event) {
                        update = true;
                        break;
                    }
                }
            }
            if (update) {
                const days_7 = moment().subtract(7, "days").endOf("day").toDate();
                const days_14 = moment().subtract(14, "days").endOf("day").toDate();
                const days_30 = moment().subtract(30, "days").endOf("day").toDate();
                const days_60 = moment().subtract(60, "days").endOf("day").toDate();
                const touchbase_events_last_7_days = touchbase_events.filter(event => new Date(event.date) > days_7).map(event => event.count).reduce((prev, curr) => prev + curr, 0);
                const touchbase_events_previous_7_days = touchbase_events.filter(event => new Date(event.date) < days_7 && new Date(event.date) > days_14).map(event => event.count).reduce((prev, curr) => prev + curr, 0);
                const touchbase_events_last_30_days = touchbase_events.filter(event => new Date(event.date) > days_30).map(event => event.count).reduce((prev, curr) => prev + curr, 0);
                const touchbase_events_previous_30_days = touchbase_events.filter(event => new Date(event.date) <= days_30 && new Date(event.date) > days_60).map(event => event.count).reduce((prev, curr) => prev + curr, 0);

                const touchbase_opens_last_7_days = touchbase_events.filter(event => new Date(event.date) > days_7 && event.action === "opens").map(event => event.count).reduce((prev, curr) => prev + curr, 0);
                const touchbase_opens_previous_7_days = touchbase_events.filter(event => new Date(event.date) < days_7 && new Date(event.date) > days_14 && event.action === "opens").map(event => event.count).reduce((prev, curr) => prev + curr, 0);
                const touchbase_opens_last_30_days = touchbase_events.filter(event => new Date(event.date) > days_30 && event.action === "opens").map(event => event.count).reduce((prev, curr) => prev + curr, 0);
                const touchbase_opens_previous_30_days = touchbase_events.filter(event => new Date(event.date) <= days_30 && new Date(event.date) > days_60 && event.action === "opens").map(event => event.count).reduce((prev, curr) => prev + curr, 0);

                const touchbase_clicks_last_7_days = touchbase_events.filter(event => new Date(event.date) > days_7 && event.action === "clicks").map(event => event.count).reduce((prev, curr) => prev + curr, 0);
                const touchbase_clicks_previous_7_days = touchbase_events.filter(event => new Date(event.date) < days_7 && new Date(event.date) > days_14 && event.action === "clicks").map(event => event.count).reduce((prev, curr) => prev + curr, 0);
                const touchbase_clicks_last_30_days = touchbase_events.filter(event => new Date(event.date) > days_30 && event.action === "clicks").map(event => event.count).reduce((prev, curr) => prev + curr, 0);
                const touchbase_clicks_previous_30_days = touchbase_events.filter(event => new Date(event.date) <= days_30 && new Date(event.date) > days_60 && event.action === "clicks").map(event => event.count).reduce((prev, curr) => prev + curr, 0);
                
                if (touchbase_events.length) {
                    await apihelper.put("reader", reader._id, { touchbase_events, touchbase_events_last_7_days, touchbase_events_previous_7_days, touchbase_events_last_30_days, touchbase_events_previous_30_days, touchbase_clicks_last_7_days, touchbase_clicks_previous_7_days, touchbase_clicks_last_30_days, touchbase_clicks_previous_30_days, touchbase_opens_last_7_days, touchbase_opens_previous_7_days, touchbase_opens_last_30_days, touchbase_opens_previous_30_days });
                }
            }
        }
    } catch(err) {
        console.error(err);
    }
}

// Make sure all the readers in Touchbase are in our Readers collection
const ensure_touchbase_readers = async () => {
    const touchbase_subscribers = (await apihelper.get("touchbasesubscriber")).data;
    for (let touchbase_subscriber of touchbase_subscribers) {
        if (!touchbase_subscriber.email) continue;
        let email = touchbase_subscriber.email;
        const reader_result = await apihelper.get("reader", { "filter[email]": touchbase_subscriber.email.toLowerCase() });
        if (!reader_result.count) { // Insert new record
            const data = {
                email: touchbase_subscriber.email.toLowerCase(),
                touchbase_data: touchbase_subscriber.data,
                touchbasesubscriber: touchbase_subscriber._id,
                email_client: touchbase_subscriber.email_client,
                email_state: touchbase_subscriber.state
            }
            await apihelper.post("reader", data);
            console.log(`POST ${data.email}`);
        } else {
            const reader = reader_result.data[0];
            const data = {
                touchbase_data: touchbase_subscriber.data,
                touchbasesubscriber: touchbase_subscriber._id,
                email_client: touchbase_subscriber.email_client,
                email_state: touchbase_subscriber.state
            }
            await apihelper.put("reader", reader._id, data);
            console.log(`PUT ${reader.email}`);
        }
    }
}

const merge_es_hits = async(start_time, end_time) => {
    const articles = (await apihelper.get("article", { fields: "post_id" })).data;
    const readers = (await apihelper.get("reader", { fields: "wordpress_id" })).data;
    const query = {
        index: "pageviews_copy",
        body: {
            "size": 5000,
            "query": {
                "bool": {
                    "must": [
                        {
                            "exists": {
                                "field": "article_id"
                            }

                        },
                        {
                            "range": {
                                "time": {
                                    "gte": moment(start_time).toISOString(),
                                    "lt": moment(end_time).toISOString(),
                                }
                            }
                        }
                    ]
                }
            }
        }
    };
    const scrollSearch = esclient.helpers.scrollSearch(query);
    let x = 0;
    for await (const result of scrollSearch) {
        const docs = result.documents.map(doc => {
            const result = {
                uid: md5(`pageview-${ doc.user_agent }-${ doc.time }`),
                timestamp: new Date(doc.time),
                url: doc.url,
                user_agent: doc.user_agent,
                post_id: doc.article_id,
                ip_addr: doc.user_ip,
                source: "pageviews",
            }
            if (doc.article_id) {
                const article = articles.find(article => article.post_id + "" === doc.article_id + "");
                if (article) {
                    result.article_id = article._id;
                }
            }
            if (doc.user_id) {
                const reader = readers.find(reader => reader.wordpress_id + "" === doc.user_id + "");
                if (reader) {
                    result.reader_id = reader._id;
                }
            }
            return result;
        })
        const bulk_result = await apihelper.bulk_postput("hit", "uid", docs);
        console.log(bulk_result);
        // if (x++ > 2) break;
    }
}

const merge_touchbase_hits = async (start_time, end_time) => {
    const limit = 10000;
    const count = (await apihelper.get("touchbaseevent", { "filter[timestamp]": `$gte:${moment(start_time).toDate()}`, limit: 1 })).count
    const pages = Math.ceil(count / limit);
    const articles = (await apihelper.get("article", { fields: "urlid", "order_by": "email" })).data;
    const readers = (await apihelper.get("reader", { fields: "email" })).data;
    for (let page = 0; page < pages; page++) {
        const touchbaseevents = await apihelper.get("touchbaseevent", { "filter[timestamp]": `$gte:${moment(start_time).toDate()}`, order_by: "timestamp", limit, page  });
        const docs = [];
        for (let doc of touchbaseevents.data) {
            const email = doc.email.toLowerCase();
            const result = {
                uid: doc.uid,
                timestamp: new Date(doc.timestamp),
                email,
                ip_addr: doc.ip_address,
                source: `touchbaseevent-${doc.event}`,
            }
            if (doc.url) {
                result.url = doc.url;
                const re = /(https:\/\/www\.dailymaverick\.co\.za\/article\/\d\d\d\d-\d\d\-\d\d-)(.*?)(\/|\?)/;
                const matches = result.url.match(re);
                if (matches && matches.length > 2) {
                    const urlid = matches[2];
                    // console.log(urlid);
                    const article = articles.find(article => article.urlid === urlid);
                    if (article) {
                        result.article_id = article._id;
                    }
                }
            }
            const reader = readers.find(reader => reader.email === email);
            if (reader) {
                result.reader_id = reader._id;
            }
            docs.push(result);
        }
        const bulk_result = await apihelper.bulk_postput("hit", "uid", docs);
        console.log(bulk_result);
    }
    // console.log(touchbaseevents.count);
    // console.log(docs.slice(1,100));
}

const merge_hits = async() => {
    const start_time = moment().subtract(1, "week").toDate();
    const end_time = new Date();
    // await merge_es_hits(start_time, end_time);
    await merge_touchbase_hits(start_time, end_time);
}

const rfv = async() => {
    console.time("rfv");
    const rfvs = await RFV();
    const per_page = 10000;
    while (rfvs.length) {
        const bulk_result = await apihelper.bulk_postput("reader", "email", rfvs.splice(0, per_page));
        console.log(bulk_result);
    }
    console.timeEnd("rfv");
}

const monetary_value = async() => {
    console.time("monetary_value");
    const monetary_values = await Monetary_Value();
    const per_page = 10000;
    while (monetary_values.length) {
        const bulk_result = await apihelper.bulk_postput("reader", "_id", monetary_values.splice(0, per_page));
        console.log(bulk_result);
    }
    console.timeEnd("monetary_value");
}

const total_lifetime_value = async () => {
    console.time("total_lifetime_value");
    const total_lifetime_values = await Total_Lifetime_Value();
    console.log(total_lifetime_values.slice(0,3));
    const per_page = 10000;
    while (total_lifetime_values.length) {
        const bulk_result = await apihelper.bulk_postput("reader", "_id", total_lifetime_values.splice(0, per_page));
        console.log(bulk_result);
    }
    console.timeEnd("total_lifetime_value");
}

const favourites = async() => {
    console.time("favourites");
    const favourites = await Favourites();
    const per_page = 10000;
    while (favourites.length) {
        const bulk_result = await apihelper.bulk_postput("reader", "email", favourites.splice(0, per_page));
        console.log(bulk_result);
    }
    console.timeEnd("favourites");
}

const main = async () => {
    // await ensure_touchbase_readers();
    // await consolidate_touchbase_events();
    // await merge_hits();
    // await rfv();
    // await monetary_value();
    await total_lifetime_value();
    // await favourites();
}

main();