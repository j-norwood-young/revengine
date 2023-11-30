require("dotenv").config();
const config = require("config");
const Apihelper = require("jxp-helper");
const apihelper = new Apihelper({ server: config.api.server, apikey: process.env.SAILTHRU_REVENGINE_APIKEY });
const sailthru_client = require("sailthru-client").createSailthruClient(process.env.SAILTHRU_KEY, process.env.SAILTHRU_SECRET);
const wordpress_auth = require("@revengine/wordpress_auth");
const Redis = require("redis");
const redis = Redis.createClient();
const errs = require('restify-errors');
const fs = require("fs");
const path = require("path");
const log_filename = path.join(__dirname, "..", "..", "logs", "sailthru.log");
const log_file = fs.createWriteStream(log_filename, { flags: 'a' });

const USER_FIELDS = "email,segmentation_id,label_id,wordpress_id,display_name,first_name,last_name,cc_expiry_date,cc_last4_digits";

async function preheat_cache() {
    await load_cache();
    // Preheat the cache every 30 minutes
    setInterval(async () => {
        await load_cache();
    }, 1000 * 60 * 30);
}

preheat_cache();

async function get_lists() {
    return new Promise((resolve, reject) => {
        sailthru_client.apiGet("list", { limit: 100 }, (err, response) => {
            if (err) return reject(err);
            resolve(response);
        });
    });
}

async function get_list(list_id) {
    return new Promise((resolve, reject) => {
        sailthru_client.apiGet("list", { list_id, limit: 100 }, (err, response) => {
            if (err) return reject(err);
            resolve(response);
        });
    });
}

async function create_list(list_name) {
    return new Promise((resolve, reject) => {
        sailthru_client.apiPost("list", { list: list_name }, (err, response) => {
            if (err) return reject(err);
            resolve(response);
        });
    });
}

async function sync_user_by_email(email) {
    try {
        const reader = (await apihelper.get("reader", { "filter[email]": email, "fields": USER_FIELDS })).data.pop();
        if (!reader) throw "Reader not found";
        const record = await map_reader_to_sailthru(reader);
        return new Promise((resolve, reject) => {
            sailthru_client.apiPost("user", record, (err, response) => {
                if (err) return reject(err);
                resolve(response);
            });
        });
    } catch (err) {
        console.error(err);
        throw err;
    }
}

async function sync_user_by_wordpress_id(wordpress_id) {
    try {
        const reader = (await apihelper.get("reader", { "filter[wordpress_id]": wordpress_id, "fields": USER_FIELDS })).data.pop();
        if (!reader) throw "Reader not found";
        const record = await map_reader_to_sailthru(reader);
        return new Promise((resolve, reject) => {
            sailthru_client.apiPost("user", record, (err, response) => {
                if (err) return reject(err);
                resolve(response);
            });
        });
    } catch (err) {
        console.error(err);
        throw err;
    }
}

async function subscribe_email_to_list(email, list_name) {
    try {
        const reader = (await apihelper.get("reader", { "filter[email]": email, "fields": USER_FIELDS })).data.pop();
        if (!reader) throw "Reader not found";
        const record = await map_reader_to_sailthru(reader);
        record.lists = { [list_name]: 1 };
        return new Promise((resolve, reject) => {
            sailthru_client.apiPost("user", record, (err, response) => {
                if (err) return reject(err);
                resolve(response);
            });
        });
    } catch (err) {
        console.error(err);
        throw err;
    }
}

async function unsubscribe_email_from_list(email, list_name) {
    try {
        const reader = (await apihelper.get("reader", { "filter[email]": email, "fields": USER_FIELDS })).data.pop();
        if (!reader) throw "Reader not found";
        const record = await map_reader_to_sailthru(reader);
        record.lists = { [list_name]: 0 };
        return new Promise((resolve, reject) => {
            sailthru_client.apiPost("user", record, (err, response) => {
                if (err) return reject(err);
                resolve(response);
            });
        });
    } catch (err) {
        console.error(err);
        throw err;
    }
}

async function get_users_in_list(list_id) {
    return new Promise((resolve, reject) => {
        sailthru_client.apiGet("list", { list_id, limit: 100 }, (err, response) => {
            if (err) return reject(err);
            resolve(response);
        });
    });
}

async function run_job(url) {
    return new Promise((resolve, reject) => {
        sailthru_client.processJob("update", {
            "job": "update",
            url: `${url}`,
        }, (err, response) => {
            if (err) return reject(err);
            resolve(response);
        });
    });
}

let segments_cache = [];
let labels_cache = [];
let subscriptions_cache = [];

async function map_reader_to_sailthru(reader) {
    if (!subscriptions_cache) {
        await load_cache();
    }
    const login_token = wordpress_auth.encrypt({
        "wordpress_id": reader.wordpress_id,
        "revengine_id": reader._id,
        "email": reader.email
    });
    const segments = [];
    for (let segmentation_id of reader.segmentation_id) {
        const segmentation = segments_cache.find(s => (s.id === segmentation_id));
        if (segmentation) {
            segments.push(segmentation.name);
        }
    }
    const labels = [];
    for (let label_id of reader.label_id) {
        const label = labels_cache.find(l => (l.id === label_id));
        if (label) {
            labels.push(label.name);
        }
    }
    
    const vars = {
        "revengine_segments": segments,
        "revengine_labels": labels,
        "revengine_last_update_time": Math.floor(new Date().getTime() / 1000),
        login_token,
        "wordpress_user_id": reader.wordpress_id,
        "revengine_id": reader._id,
    }
    if (reader.first_name) vars["first_name"] = reader.first_name;
    if (reader.last_name) vars["last_name"] = reader.last_name;
    if (reader.cc_expiry_date && reader.cc_last4_digits) {
        vars["cc_expiry_date"] = new Date(reader.cc_expiry_date).toISOString().slice(0, 10);
        vars["cc_last4_digits"] = reader.cc_last4_digits;
    }
    let subscription = subscriptions_cache.find(s => (s.customer_id === reader.wordpress_id));
    if (subscription) {
        vars["subscription_billing_period"] = subscription.billing_period;
        vars["subscription_payment_method"] = subscription.payment_method;
        vars["subscription_status"] = subscription.status;
        vars["subscription_total"] = subscription.total;
        vars["subscription_total_avg_per_month"] = subscription.total / (subscription.billing_period == "month" ? 1 : 12);
        vars["subscription_utm_campaign"] = subscription.utm_campaign;
        vars["subscription_utm_medium"] = subscription.utm_medium;
        vars["subscription_utm_source"] = subscription.utm_source;
        let revio_payment_method = subscription.meta_data.find(m => (m.key === "_revio_payment_method"));
        if (revio_payment_method) {
            vars["subscription_revio_payment_method"] = revio_payment_method.value;
        }
    }
    const record = {
        "id": reader.email,
        "keys": {
            "extid": reader.wordpress_id
        },
        "fields": {
            "keys": 1,
            // "name": reader.display_name || [reader.first_name, reader.last_name].join(" "),
        },
        "vars": vars,
    }
    return record;
}

function redis_get(key) {
    return new Promise((resolve, reject) => {
        redis.get(key, (err, reply) => {
            if (err) return reject(err);
            try {
                const json = JSON.parse(reply);
                if (!json) return resolve(false);
                // console.log("Cache hit")
                resolve(json);
            } catch (err) {
                resolve(false);
            }
        });
    });
}

function redis_set(key, value, ttl) {
    const json = JSON.stringify(value);
    return new Promise((resolve, reject) => {
        redis.set(key, json, "EX", ttl, (err, reply) => {
            if (err) return reject(err);
            resolve(reply);
        });
    });
}

async function load_cache() {
    segments_cache = (await apihelper.get("segmentation")).data;
    labels_cache = (await apihelper.get("label")).data;
    // Check if we have a redis cache for subscriptions. If not, load it from the API and cache it for 1 hour.
    const subscriptions_cache_key = "sailthru_subscriptions_cache";
    const subscriptions_cache_ttl = 60 * 60;
    subscriptions_cache = await redis_get(subscriptions_cache_key);
    if (!subscriptions_cache) {
        console.log("Subscriptions cache miss")
        subscriptions_cache = (await apihelper.get("woocommerce_subscription", {
            "fields": "customer_id,billing_period,payment_method,status,total,utm_campaign,utm_medium,utm_source,meta_data"
        })).data;
        await redis_set(subscriptions_cache_key, subscriptions_cache, subscriptions_cache_ttl);
    }
}

async function serve_segments_test(req, res) {
    try {
        const readers = (await apihelper.get("reader", { "limit": 10000, "filter[email]": "$regex:@dailymaverick.co.za", "fields": USER_FIELDS })).data;
        // const readers = (await apihelper.get("reader", { "filter[email]": "jason@10layer.com", "sort": "wordpress_id", "limit": 10000, "fields": USER_FIELDS })).data;
        // We only want to generate segmenst and labels once
        await load_cache();
        const result = [];
        for (let reader of readers) {
            const record = await map_reader_to_sailthru(reader);
            result.push(record);
        }
        console.log(`Generate Sailthru user list. ${result.length} records.`)
        let s = "";
        for (let record of result) {
            s = JSON.stringify(record, null, "") + "\n";
            res.write(s);
        }
        res.end();
    } catch (err) {
        console.error(err);
        res.send(new errs.InternalServerError(err));
    }
}

async function serve_segments_paginated(req, res) {
    try {
        const per_page = req.params.per_page || 10000;
        const page = req.params.page || 1;
        const readers = (await apihelper.get("reader", { "filter[wordpress_id]": "$exists:1", "sort": "wordpress_id", "limit": per_page, "page": page, "fields": USER_FIELDS })).data;
        await load_cache();
        const result = [];
        for (let reader of readers) {
            const record = await map_reader_to_sailthru(reader);
            result.push(record);
            await log_file.write(`${reader.email}\n`);
        }
        console.log(`Generate Sailthru user list. ${result.length} records.`)
        let s = "";
        for (let record of result) {
            s = JSON.stringify(record, null, "") + "\n";
            res.write(s);
        }
        res.end();
    } catch (err) {
        console.error(err);
        res.send(new errs.InternalServerError(err));
    }
}

async function serve_update_job_test(req, res) {
    try {
        const url = `${config.listeners.protected_url}/sailthru/segment_update/test?apikey=${process.env.SAILTHRU_REVENGINE_APIKEY}`
        const job = await run_job(url);
        res.send(job);
    } catch (err) {
        console.error(err);
        res.send(new errs.InternalServerError(err));
    }
}

async function get_job_status(job_id) {
    return new Promise((resolve, reject) => {
        sailthru_client.apiGet("job", { job_id }, (err, response) => {
            if (err) return reject(err);
            resolve(response);
        });
    });
}

async function serve_job_status(req, res) {
    try {
        const job_id = req.params.job_id;
        const job = await get_job_status(job_id);
        res.send(job);
    } catch (err) {
        console.error(err);
        res.send(new errs.InternalServerError(err));
    }
}

async function queue_all_jobs() {
    const user_count = await apihelper.count("reader", { "filter[wordpress_id]": "$exists:1" });
    const per_page = 10000;
    const pages = Math.ceil(user_count / per_page);
    // const pages = 10;
    console.log(`Queueing ${pages} jobs`);
    const jobs = [];
    for (let i = 1; i <= pages; i++) {
        const url = `${config.listeners.protected_url}/sailthru/segment_update/${i}?apikey=${process.env.SAILTHRU_REVENGINE_APIKEY}`
        const job = await run_job(url);
        console.log(`Queued job ${job.job_id}`);
        jobs.push(job);
    }
    return jobs;
}

async function serve_queue_all_jobs(req, res) {
    try {
        const jobs = await queue_all_jobs();
        res.send(jobs);
    } catch (err) {
        console.error(err);
        res.send(new errs.InternalServerError(err));
    }
}

exports.get_lists = get_lists;
exports.get_list = get_list;
exports.create_list = create_list;
exports.subscribe_email_to_list = subscribe_email_to_list;
exports.unsubscribe_email_from_list = unsubscribe_email_from_list;
exports.serve_segments_test = serve_segments_test;
exports.serve_update_job_test = serve_update_job_test;
exports.serve_job_status = serve_job_status;
exports.serve_segments_paginated = serve_segments_paginated;
exports.serve_queue_all_jobs = serve_queue_all_jobs;
exports.sync_user_by_email = sync_user_by_email;
exports.sync_user_by_wordpress_id = sync_user_by_wordpress_id;