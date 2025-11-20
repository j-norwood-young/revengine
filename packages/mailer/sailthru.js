import dotenv from "dotenv";
dotenv.config();
import config from "config";
import JXPHelper from "jxp-helper";
const apihelper = new JXPHelper({ server: config.api.cluster_server, apikey: process.env.SAILTHRU_REVENGINE_APIKEY });
import sailthru_client from "sailthru-client";
import { encrypt } from "@revengine/wordpress_auth";

import errs from 'restify-errors';
import Cache from "@revengine/common/cache.js";
const cache = new Cache({ prefix: "sailthru", debug: true, ttl: 60 * 60 });
import { fetch_csv } from "@revengine/common/csv.js";

const USER_FIELDS = "email,segmentation_id,label_id,wordpress_id,display_name,first_name,last_name,cc_expiry_date,cc_last4_digits";
const SUBSCRIPTIONS_CACHE_KEY = "sailthru_subscriptions_cache";
let cache_loaded = false;

/**
 * Loads the cache for segments, labels, and subscriptions.
 * @returns {Promise<void>} A promise that resolves once the cache is loaded.
 */
async function load_cache() {
    try {
        segments_cache = (await apihelper.get("segmentation")).data;
        labels_cache = (await apihelper.get("label")).data;
        // subscriptions_cache = await get_subscriptions();
        cache_loaded = true;
    } catch (err) {
        console.error(err);
        // Retry in 10 seconds
        setTimeout(load_cache, 10000);
    }
}

async function get_subscriptions() {
    try {
        // Check if we have a redis cache for subscriptions. If not, load it from the API and cache it for 1 hour.
        const subscriptions_cache_ttl = 60 * 60;
        let subscriptions = await cache.get(SUBSCRIPTIONS_CACHE_KEY);
        if (!subscriptions) {
            console.log("Subscriptions Cache Miss");
            subscriptions = (await apihelper.get("woocommerce_subscription", {
                "fields": "customer_id,billing_period,payment_method,status,total,utm_campaign,utm_medium,utm_source,meta_data,date_created,date_modified"
            })).data;
            await cache.set(SUBSCRIPTIONS_CACHE_KEY, subscriptions, subscriptions_cache_ttl);
        }
        return subscriptions;
    } catch (err) {
        console.error(err);
        throw err;
    }
}

/**
 * Preheats the cache by deleting the "sailthru_subscriptions_cache" key and loading the cache.
 * The cache is preheated every 30 minutes by calling load_cache function.
 * @returns {Promise<void>} A promise that resolves when the cache is preheated.
 */
async function keep_cache_fresh() {
    await cache.del(SUBSCRIPTIONS_CACHE_KEY);
    await load_cache();
}

keep_cache_fresh();

setInterval(async () => {
    await keep_cache_fresh();
}, 1000 * 60 * 60); // 60 minutes

/**
 * Retrieves a list of mailing lists from Sailthru.
 * @returns {Promise<Array>} A promise that resolves to an array of lists.
 * @throws {Error} If an error occurs during the API call or if no lists are found.
 */
async function get_lists() {
    return new Promise((resolve, reject) => {
        sailthru_client.apiGet("list", { limit: 100 }, (err, response) => {
            if (err) return reject(err);
            if (!response.lists) return reject("No lists found");
            resolve(response.lists);
        });
    });
}

/**
 * Retrieves a mailing list from Sailthru API.
 * @param {string} list_id - The ID of the list to retrieve.
 * @returns {Promise<object>} - A promise that resolves with the response from the Sailthru API.
 */
async function get_list(list_id) {
    return new Promise((resolve, reject) => {
        sailthru_client.apiGet("list", { list_id, limit: 100 }, (err, response) => {
            if (err) return reject(err);
            resolve(response);
        });
    });
}

/**
 * Creates a new Sailthru mailing list with the given name.
 * @param {string} list_name - The name of the list to be created.
 * @returns {Promise<Object>} - A promise that resolves to the response object from the Sailthru API.
 */
async function create_list(list_name) {
    return new Promise((resolve, reject) => {
        sailthru_client.apiPost("list", { list: list_name }, (err, response) => {
            if (err) return reject(err);
            resolve(response);
        });
    });
}

/**
 * Synchronizes a user by email with Sailthru.
 * @param {string} email - The email of the user to synchronize.
 * @returns {Promise<Object>} - A promise that resolves with the response from Sailthru API.
 * @throws {string} - Throws an error if the reader is not found.
 */
async function sync_user_by_email(email) {
    try {
        const reader = (await apihelper.get("reader", { "filter[email]": email, "fields": USER_FIELDS })).data.pop();
        if (!reader) throw `Reader not found: ${email}`;
        const record = await map_reader_to_sailthru(reader, false);
        return new Promise((resolve, reject) => {
            sailthru_client.apiPost("user", record, (err, response) => {
                if (err) {
                    console.error(err);
                    return reject(err.errormsg || err);
                }
                resolve(response);
            });
        });
    } catch (err) {
        console.error(err);
        throw err;
    }
}

/**
 * Synchronizes a user by their WordPress ID with Sailthru.
 * @param {string} wordpress_id - The WordPress ID of the user.
 * @returns {Promise<object>} - A promise that resolves to the response from Sailthru API.
 * @throws {string} - Throws an error if the reader is not found.
 */
async function sync_user_by_wordpress_id(wordpress_id) {
    try {
        const reader = (await apihelper.get("reader", { "filter[wordpress_id]": wordpress_id, "fields": USER_FIELDS })).data.pop();
        if (!reader) throw `Reader not found: wordpress_id ${wordpress_id}`;
        const record = await map_reader_to_sailthru(reader, false);
        return new Promise((resolve, reject) => {
            sailthru_client.apiPost("user", record, (err, response) => {
                if (err) {
                    console.error(err);
                    return reject(err.errormsg || err);
                }
                resolve(response);
            });
        });
    } catch (err) {
        console.error(err);
        throw err;
    }
}

/**
 * Synchronizes a user by their reader ID with Sailthru.
 * @param {string} reader_id - The ID of the reader.
 * @returns {Promise<object>} - A promise that resolves to the response from Sailthru.
 * @throws {string} - If the reader is not found.
 */
async function sync_user_by_reader_id(reader_id) {
    try {
        const reader = (await apihelper.getOne("reader", reader_id, { "fields": USER_FIELDS })).data;
        if (!reader) throw `Reader not found: reader_id ${reader_id}`;
        const record = await map_reader_to_sailthru(reader, false);
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

/**
 * Subscribes an email to a specified list in Sailthru.
 * @param {string} email - The email address to subscribe.
 * @param {string} list_name - The name of the list to subscribe the email to.
 * @returns {Promise} A promise that resolves with the response from Sailthru API.
 * @throws {string} If the reader is not found or an error occurs during the subscription process.
 */
async function subscribe_email_to_list(email, list_name) {
    try {
        const reader = (await apihelper.get("reader", { "filter[email]": email, "fields": USER_FIELDS })).data.pop();
        if (!reader) throw `Reader not found: ${email}`;
        const record = await map_reader_to_sailthru(reader, false);
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

/**
 * Subscribes a reader to a specific list.
 * 
 * @param {string} reader_id - The ID of the reader.
 * @param {string} list_name - The name of the list to subscribe the reader to.
 * @returns {Promise} A promise that resolves with the response from the Sailthru API.
 * @throws {string} If the reader is not found.
 */
async function subscribe_reader_to_list(reader_id, list_name) {
    try {
        const reader = (await apihelper.getOne("reader", reader_id, { "fields": USER_FIELDS })).data;
        if (!reader) throw `Reader not found: reader_id ${reader_id}`;
        const record = await map_reader_to_sailthru(reader, false);
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

/**
 * Unsubscribes an email from a specific list.
 * @param {string} email - The email address to unsubscribe.
 * @param {string} list_name - The name of the list to unsubscribe from.
 * @returns {Promise} A promise that resolves with the response from the Sailthru API.
 * @throws {Error} If the reader is not found or an error occurs during the API call.
 */
async function unsubscribe_email_from_list(email, list_name) {
    try {
        const reader = (await apihelper.get("reader", { "filter[email]": email, "fields": USER_FIELDS })).data.pop();
        if (!reader) throw `Reader not found: ${email}`;
        const record = await map_reader_to_sailthru(reader, false);
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

/**
 * Unsubscribes a reader from a specific list.
 * @param {string} reader_id - The ID of the reader.
 * @param {string} list_name - The name of the list to unsubscribe from.
 * @returns {Promise} A promise that resolves with the response from the Sailthru API.
 * @throws {Error} If the reader is not found or an error occurs during the API call.
 */
async function unsubscribe_reader_from_list(reader_id, list_name) {
    try {
        const reader = (await apihelper.getOne("reader", reader_id, { "fields": USER_FIELDS })).data;
        if (!reader) throw `Reader not found: reader_id ${reader_id}`;
        const record = await map_reader_to_sailthru(reader, false);
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

/**
 * Retrieves users in a given Sailthru mailing list.
 * @param {string} list_id - The ID of the list.
 * @returns {Promise<Object>} - A promise that resolves with the response object containing the users in the list.
 */
async function get_users_in_list(list_id) {
    const job = await new Promise((resolve, reject) => {
        sailthru_client.processJob("export_list_data", {
            "job": "export_list_data",
            list: `${list_id}`,
        }, (err, response) => {
            if (err) return reject(err);
            resolve(response);
        });
    });
    const job_id = job.job_id;
    console.log(`Preparing job ${job_id}`)
    const job_result = await await_job_result(job_id);
    const url = job_result.export_url;
    const data = await fetch_csv(url);
    const user_ids = data.map(u => (u["Profile Id"]));
    console.log(`Found ${user_ids.length} users in list ${list_id}`);
    let users = [];
    for (let user_id of user_ids.slice(0, 100)) {
        const user = await get_user_by_sid(user_id);
        users.push(user);
    }
    return users;
}

/**
 * Retrieves user information from Sailthru based on the provided email or ID.
 * @param {string|number} email_or_id - The email or ID of the user.
 * @returns {Promise<object>} - A promise that resolves to the user information.
 */
async function get_user(email_or_id) {
    return new Promise((resolve, reject) => {
        // if number, then id, else email
        if (typeof email_or_id === "number") {
            return sailthru_client.apiGet("user", { id: email_or_id, key: "extid" }, (err, response) => {
                if (err) return reject(err);
                if (!response) return reject("User not found");
                resolve(response);
            });
        } else {
            return sailthru_client.apiGet("user", { id: email_or_id }, (err, response) => {
                if (err) return reject(err);
                if (!response) return reject("User not found");
                resolve(response);
            });
        }
    });
}

async function get_user_by_sid(sid) {
    return new Promise((resolve, reject) => {
        return sailthru_client.apiGet("user", { id: sid, key: "sid" }, (err, response) => {
            if (err) return reject(err);
            if (!response) return reject("User not found");
            resolve(response);
        });
    });
}

/**
 * Instructs Sailthru to retrieve the URL and update users in Sailthru based on the content.
 * @param {string} url - The URL.
 * @returns {Promise<any>} - A promise that resolves with the response from the Sailthru client.
 */
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

/**
 * Maps a reader object to the Sailthru format.
 * @param {Object} reader - The reader object to be mapped.
 * @param {boolean} [use_cache=true] - Indicates whether to use the cache for retrieving data.
 * @returns {Object} - The mapped Sailthru record.
 */
async function map_reader_to_sailthru(reader, use_cache = true, cached_subscriptions) {
    // const cached_subscriptions = await get_subscriptions();
    const login_token = encrypt({
        "wordpress_id": reader.wordpress_id,
        "revengine_id": reader._id,
        "email": reader.email
    });
    const segments = [];
    if (!reader.segmentation_id) reader.segmentation_id = [];
    for (let segmentation_id of reader.segmentation_id) {
        const segmentation = segments_cache.find(s => (s.id === segmentation_id));
        if (segmentation) {
            segments.push(segmentation.name);
        }
    }
    const labels = [];
    if (!reader.label_id) reader.label_id = [];
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
    if (reader.display_name) vars["full_name"] = reader.display_name;
    if (reader.cc_expiry_date && reader.cc_last4_digits) {
        vars["cc_expiry_date"] = new Date(reader.cc_expiry_date).toISOString().slice(0, 10);
        vars["cc_last4_digits"] = reader.cc_last4_digits;
    }
    let subscriptions;
    if (use_cache) {
        if (!cache_loaded) throw "Cache not loaded";
        subscriptions = cached_subscriptions.filter(s => (s.customer_id === reader.wordpress_id));
    } else {
        subscriptions = (await apihelper.get("woocommerce_subscription", {
            "filter[customer_id]": reader.wordpress_id,
            "fields": "customer_id,billing_period,payment_method,status,total,utm_campaign,utm_medium,utm_source,meta_data,date_created,date_modified"
        })).data;
    }
    if (subscriptions.length > 0) {
        const subscription = subscriptions.sort((a, b) => (new Date(b.date_modified) - new Date(a.date_modified))).shift();
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
            if (subscription.date_created) {
                vars["subscription_created_date"] = new Date(subscription.date_created).toISOString().slice(0, 10);
            }
            if (subscription.date_modified) {
                vars["subscription_modified_date"] = new Date(subscription.date_modified).toISOString().slice(0, 10);
            }
        }
    } else {
        // console.log(`No subscription found for ${reader.email}`)
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

/**
 * Serves a page to Sailthru including enriched reader data to update the users in Sailthru.
 * 
 * @param {Object} req - The request object.
 * @param {String} req.params.uid - The unique identifier of the cache.
 * @param {String} req.params.page - The page number.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A promise that resolves when the push request is served.
 * @throws {Error} - If an error occurs while serving the push request.
 */
async function serve_push(req, res) {
    try {
        const uid = req.params.uid;
        const page = parseInt(req.params.page);
        const readers = await cache.get(`${uid}-${page}`);
        if (!readers) throw "Cache not found";
        await load_cache();
        const cached_subscriptions = await get_subscriptions();
        const result = [];
        for (let reader of readers) {
            try {
                const record = await map_reader_to_sailthru(reader, true, cached_subscriptions);
                result.push(record);
            } catch (err) {
                console.error(`Error processing reader ${reader.email}`)
                console.error(err);
            }
            // await log_file.write(`${reader.email}\n`);
        }
        console.log(`Generate Sailthru user list for page ${page}. ${result.length} records.`)
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

/**
 * Retrieves the status of a Sailthru job using the provided job ID.
 * @param {string} job_id - The ID of the job to retrieve the status for.
 * @returns {Promise<object>} - A promise that resolves with the response containing the job status.
 */
async function get_job_status(job_id) {
    return new Promise((resolve, reject) => {
        sailthru_client.apiGet("job", { job_id }, (err, response) => {
            if (err) return reject(err);
            resolve(response);
        });
    });
}

/**
 * Serves the status of a job.
 * @param {Object} req - The request object.
 * @param {string} req.params.job_id - The ID of the job to retrieve the status for.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A promise that resolves when the job status is served.
 */
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

/**
 * Syncs readers that have had their segments or labels chagned, or have been created recently, with Sailthru through a number of jobs. Waits for the results, checks for errors, and adds the errors along with the offending reader to the results.
 * @returns {Promise<Array>} An array of job results.
 */
async function queue() {
    const uid = `sailthru-${new Date().getTime()}`;
    const start_date = {
        $dateSubtract: {
            startDate: "$$NOW",
            unit: "day",
            amount: 6
        }
    }
    const match = {
        "wordpress_id": { $exists: true },
        "$or": [
            {
                "$expr": {
                    "$gte": [
                        "$segment_update",
                        start_date
                    ]
                }
            },
            {
                "$expr": {
                    "$gte": [
                        "$label_update",
                        start_date
                    ]
                }
            },
            {
                "$expr": {
                    "$gte": [
                        "$createdAt",
                        start_date
                    ]
                }
            },
            {
                "paying_customer": true,
            },
            {
                "$expr": {
                    "$eq": [
                        "$label_id",
                        "661fdcfaa6d5931ebe671929"
                    ]
                }
            }
        ]
    };
    const query = [
        { $match: match },
        {
            $project: {
                _id: 1,
                email: 1,
                label_id: 1,
                segmentation_id: 1,
                first_name: 1,
                last_name: 1,
                cc_expiry_date: 1,
                cc_last4_digits: 1,
                wordpress_id: 1,
                segment_update: 1,
                label_update: 1,
            }
        }
    ];
    const result = await apihelper.aggregate("reader", query);
    const per_page = 5000;
    const pages = Math.ceil(result.data.length / per_page);
    const job_results = [];
    console.log(`Queueing ${pages} jobs`);
    for (let page = 0; page < pages; page++) {
        const readers = result.data.slice(page * per_page, (page + 1) * per_page);
        cache.set(`${uid}-${page}`, readers, 60 * 60);
        const url = `${config.listeners.protected_url}/sailthru/push/${uid}/${page}?apikey=${process.env.SAILTHRU_REVENGINE_APIKEY}`
        const job = await run_job(url);
        const job_id = job.job_id;
        const job_result = await await_job_result(job_id, `${uid}-${page}`);
        job_results.push(job_result);
    }
    return job_results;
}

/**
 * Syncs all readers with Sailthru through a number of jobs. Waits for the results, checks for errors, and adds the errors along with the offending reader to the results.
 * @returns {Promise<Array>} An array of job results.
 */
async function full_queue() {
    const uid = `sailthru-${new Date().getTime()}`;
    const start_date = {
        $dateSubtract: {
            startDate: "$$NOW",
            unit: "day",
            amount: 6
        }
    }
    const match = {
        "wordpress_id": { $exists: true }
    };
    const query = [
        { $match: match },
        {
            $project: {
                _id: 1,
                email: 1,
                label_id: 1,
                segmentation_id: 1,
                first_name: 1,
                last_name: 1,
                cc_expiry_date: 1,
                cc_last4_digits: 1,
                wordpress_id: 1,
                segment_update: 1,
                label_update: 1,
            }
        }
    ];
    const result = await apihelper.aggregate("reader", query);
    const per_page = 10000;
    const pages = Math.ceil(result.data.length / per_page);
    const job_results = [];
    console.log(`Queueing ${pages} jobs`);
    for (let page = 0; page < pages; page++) {
        const readers = result.data.slice(page * per_page, (page + 1) * per_page);
        cache.set(`${uid}-${page}`, readers, 60 * 60);
        const url = `${config.listeners.protected_url}/sailthru/push/${uid}/${page}?apikey=${process.env.SAILTHRU_REVENGINE_APIKEY}`
        const job = await run_job(url);
        const job_id = job.job_id;
        const job_result = await await_job_result(job_id, `${uid}-${page}`);
        job_results.push(job_result);
    }
    return job_results;
}

/**
 * Retrieves an error report from a specified URL and associates each error with its corresponding reader.
 * @param {string} url - The URL to fetch the error report from.
 * @param {string} uid_page - The unique identifier of the cache and page.
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of error objects, each containing the parsed error information and its associated reader.
 */
async function get_error_report(url, uid_page) {
    const readers = await cache.get(uid_page);
    const response = await fetch(url);
    const text = await response.text();
    const lines = text.split("\n");
    const result = [];
    // console.log(readers);
    for (let line of lines) {
        try {
            const json = JSON.parse(line);
            const line_number = parseInt(json.lineNumber);
            const reader = readers[line_number - 1];
            // console.log({ line_number, reader })
            json.reader = reader;
            result.push(json);
        } catch (err) {
            // Don't do anything
            // console.log(err);
        }
    }
    return result;
}

/**
 * Asynchronously waits for the completion of a job and returns the job result.
 * @param {string} job_id - The ID of the job to await.
 * @param {string} uid_page - The UID and page associated with the job.
 * @returns {Promise<Object>} - A promise that resolves to the job result.
 * @throws {string} - Throws an error if the job times out or fails.
 */
async function await_job_result(job_id, uid_page = null) {
    let job = await get_job_status(job_id);
    const max_tries = 120;
    let tries = 0;
    while (job.status === "pending" && tries < max_tries) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        job = await get_job_status(job_id);
        tries++;
    }
    console.log(job);
    if (job.status === "pending") throw "Job timed out";
    if (job.status !== "completed") throw "Job failed";
    if (job.error_report_url && uid_page) {
        job.errors = await get_error_report(job.error_report_url, uid_page);
    }
    return job;
}

/**
 * Serves the queue of jobs.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A promise that resolves when the queue is served.
 */
async function serve_queue(req, res) {
    try {
        const jobs = await queue();
        res.send(jobs);
    } catch (err) {
        console.error(err);
        res.send(new errs.InternalServerError(err));
    }
}

/**
 * Serves the full queue of jobs.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A promise that resolves when the queue is served.
 */
async function serve_full_queue(req, res) {
    try {
        const jobs = await full_queue();
        res.send(jobs);
    } catch (err) {
        console.error(err);
        res.send(new errs.InternalServerError(err));
    }
}


/**
 * Retrieves templates from Sailthru.
 * @returns {Promise<Array>} A promise that resolves with an array of templates.
 */
function get_templates() {
    return new Promise((resolve, reject) => {
        sailthru_client.apiGet("template", { limit: 100 }, (err, response) => {
            if (err) return reject(err);
            if (!response.templates) return reject("No templates found");
            resolve(response.templates);
        });
    });
}

/**
 * Sends a template to a reader.
 * @param {string} reader_id - The ID of the reader.
 * @param {string} template_name - The name of the template to send.
 * @param {Object} vars - Optional variables to be used in the template.
 * @returns {Promise<Object>} - A promise that resolves with the response from Sailthru API.
 * @throws {string} - Throws an error if the reader is not found.
 */
async function send_template_to_reader(reader_id, template_name, vars = {}) {
    const reader = (await apihelper.getOne("reader", reader_id, { "fields": USER_FIELDS })).data;
    if (!reader) throw `Reader not found: reader_id: ${reader_id}`;
    return new Promise((resolve, reject) => {
        sailthru_client.apiPost("send", {
            "template": template_name,
            "email": reader.email,
            "vars": vars
        }, (err, response) => {
            if (err) return reject(err);
            resolve(response);
        });
    });
}

export {
    get_lists,
    get_list,
    get_users_in_list,
    create_list,
    subscribe_email_to_list,
    unsubscribe_email_from_list,
    serve_job_status,
    serve_push,
    serve_queue,
    serve_full_queue,
    sync_user_by_email,
    sync_user_by_wordpress_id,
    get_templates,
    get_user,
    subscribe_reader_to_list,
    unsubscribe_reader_from_list,
    send_template_to_reader,
    sync_user_by_reader_id
};
