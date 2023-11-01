const axios = require('axios');
const moment = require('moment');
require("dotenv").config();
const sailthru_client = require("sailthru-client").createSailthruClient(process.env.SAILTHRU_KEY, process.env.SAILTHRU_SECRET);

async function get_lists() {
    return new Promise((resolve, reject) => {
        sailthru_client.apiGet("list", { limit: 100 }, (err, response) => {
            if (err) reject(err);
            resolve(response);
        });
    });
}

async function get_list(list_id) {
    return new Promise((resolve, reject) => {
        sailthru_client.apiGet("list", { list_id, limit: 100 }, (err, response) => {
            if (err) reject(err);
            resolve(response);
        });
    });
}

async function create_list(list_name) {
    return new Promise((resolve, reject) => {
        sailthru_client.apiPost("list", { list: list_name }, (err, response) => {
            if (err) reject(err);
            resolve(response);
        });
    });
}

async function subscribe_readers(readers, list_id) {
    return new Promise((resolve, reject) => {
        sailthru_client.processJob("update", {
            
        })
    });
}

exports.get_lists = get_lists;
exports.get_list = get_list;
exports.create_list = create_list;