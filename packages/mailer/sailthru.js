require("dotenv").config();
const config = require("config");
const Apihelper = require("jxp-helper");
const apihelper = new Apihelper({ server: config.api.server, apikey: process.env.SAILTHRU_REVENGINE_APIKEY });
const sailthru_client = require("sailthru-client").createSailthruClient(process.env.SAILTHRU_KEY, process.env.SAILTHRU_SECRET);
const wordpress_auth = require("@revengine/wordpress_auth");

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

let allsegments = [];
let alllabels = [];

async function map_reader_to_sailthru(reader) {
    const login_token = wordpress_auth.encrypt({
        "wordpress_id": reader.wordpress_id,
        "revengine_id": reader._id,
        "email": reader.email
    });
    const segments = [];
    for (let segmentation_id of reader.segmentation_id) {
        const segmentation = allsegments.find(s => (s.id === segmentation_id));
        if (segmentation) {
            segments.push(segmentation.name);
        }
    }
    const labels = [];
    for (let label_id of reader.label_id) {
        const label = alllabels.find(l => (l.id === label_id));
        if (label) {
            labels.push(label.name);
        }
    }
    const record = {
        "id": reader.email,
        "keys": {
            "extid": reader.wordpress_id
        },
        "fields": {
            "keys": 1,
            "name": reader.display_name || [reader.first_name, reader.last_name].join(" "),
        },
        "vars": {
            "revengine_segments": segments,
            "revengine_labels": labels,
            "revengine_last_update_date": new Date().toISOString(),
            "first_name": reader.first_name,
            "last_name": reader.last_name,
            "cc_expiry_date": reader.cc_expiry_date,
            login_token,
            // "recency_quantile_rank": reader.recency_quantile_rank || 0,
            // "frequency_quantile_rank": reader.frequency_quantile_rank || 0,
            // "volume_quantile_rank": reader.volume_quantile_rank || 0,
            // "monthly_contribution": reader.monthly_contribution || 0,
            // "member": reader.member ? "yes" : "no",
            // "favourite_author": reader.favourite_author,
            // "favourite_section": reader.favourite_section,
            // "sent_insider_welcome_email_date": reader.sent_insider_welcome_email,
        }
    }
    return record;
}

async function serve_segments_test(req, res) {
    const readers = (await apihelper.get("reader", { "limit": 10000, "filter[email]": "$regex:@dailymaverick.co.za", "fields": "email,segmentation_id,label_id,wordpress_id,display_name,first_name,last_name,cc_expiry_date,favourite_author,favourite_section,sent_insider_welcome_email" })).data;
    // We only want to generate segmenst and labels once
    allsegments = (await apihelper.get("segmentation")).data;
    alllabels = (await apihelper.get("label")).data;
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
}

async function serve_segments_paginated(req, res) {
    const per_page = req.params.per_page || 10000;
    const page = req.params.page || 1;
    const readers = (await apihelper.get("reader", { "filter[wordpress_id]": "$exists:1", "sort": "wordpress_id", "limit": per_page, "page": page, "fields": "email,segmentation_id,label_id,wordpress_id,display_name,first_name,last_name,cc_expiry_date" })).data;   
    // We only want to generate segmenst and labels once
    allsegments = (await apihelper.get("segmentation")).data;
    alllabels = (await apihelper.get("label")).data;
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
}

async function serve_update_job_test(req, res) {
    const url = `${config.listeners.protected_url}/sailthru/segment_update/test?apikey=${process.env.SAILTHRU_REVENGINE_APIKEY}`
    const job = await run_job(url);
    res.send(job);
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
    const job_id = req.params.job_id;
    const job = await get_job_status(job_id);
    res.send(job);
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
    const jobs = await queue_all_jobs();
    res.send(jobs);
}

exports.get_lists = get_lists;
exports.get_list = get_list;
exports.create_list = create_list;
exports.serve_segments_test = serve_segments_test;
exports.serve_update_job_test = serve_update_job_test;
exports.serve_job_status = serve_job_status;
exports.serve_segments_paginated = serve_segments_paginated;
exports.serve_queue_all_jobs = serve_queue_all_jobs;