const axios = require("axios");
const config = require("config");
require("dotenv").config();
const JXPHelper = require("jxp-helper");
const apihelper = new JXPHelper({ server: process.env.API_SERVER || config.api.server, apikey: process.env.APIKEY });
const wordpress_auth = require("@revengine/wordpress_auth");

const get_woocommerce_user = async (user_id) => {
    const username = process.env.WOOCOMMERCE_USERNAME;
    const password = process.env.WOOCOMMERCE_PASSWORD;
    const url = `${config.woocommerce.api}/customers/${user_id}`;
    const basic_auth = `Basic ${new Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
    const res = await fetch(url, { headers: { 'Authorization': basic_auth } });
    return await res.json();
}

async function sync_user(wordpress_user_id) {
    try {
        const api_response = (await axios.get(`${config.wordpress.revengine_api}/user/${wordpress_user_id}`, { headers: { Authorization: `Bearer ${process.env.WORDPRESS_KEY}` } })).data;
        if (config.debug) {
            console.log(JSON.stringify(api_response, null, 2));
        }
        const wpuser = api_response.data.pop();
        if (!wpuser) throw "User not found in Wordpress";
        if (config.debug) {
            console.log({ wpuser });
        }
        const wordpressuser = (await apihelper.postput("wordpressuser", "id", wpuser)).data;
        const reader_data = {
            wordpressuser_id: wordpressuser._id,
            email: wordpressuser.user_email.toLowerCase().trim(),
            wordpress_id: wordpressuser.id,
            first_name: wordpressuser.first_name,
            last_name: wordpressuser.last_name,
            display_name: wordpressuser.display_name,
            user_registered_on_wordpress: wordpressuser.user_registered,
            cc_expiry_date: wordpressuser.cc_expiry_date,
            cc_last4_digits: wordpressuser.cc_last4_digits
        }
        const result = (await apihelper.postput("reader", "wordpress_id", reader_data));
        return result;
    } catch (err) {
        return Promise.reject(err);
    }
}

async function sync_subscription(wordpress_user_id) {
    const subscription = (await axios.get(`${config.wordpress.revengine_api}/woocommerce_subscriptions?customer_id=${wordpress_user_id}`, { headers: { Authorization: `Bearer ${process.env.WORDPRESS_KEY}` } })).data.data.pop();
    if (!subscription) {
        console.log("Subscription not found for user", wordpress_user_id);
        return null;
    }
    return (await apihelper.postput("woocommerce_subscription", "id", subscription)).data;
}

async function sync_readers_missing_in_wordpress(parts = 1, part = 0, limit = 100) {
    console.log(`Syncing readers missing in Wordpress, split into ${parts} parts, starting at part ${part}`);
    const count = (await apihelper.count("reader", { "filter[wordpress_id]": "$exists:0" }));
    console.log(`Found ${count} readers missing in Wordpress`)
    const pages = Math.ceil(count / limit / parts);
    const start_page = Math.ceil(pages / parts * part);
    console.log(`Starting at page ${start_page} of ${pages}`)
    for (let page = start_page; page <= pages + start_page; page++) {
        console.log(`Syncing page ${page} of ${pages}`);
        const readers = (await apihelper.get("reader", { "filter[wordpress_id]": "$exists:0", limit, page, "fields": "email" })).data;
        console.log(`Found ${readers.length} readers missing in Wordpress`);
        for (let reader of readers) {
            if (!reader.email) continue;
            const url = `${config.wordpress.revengine_api}/sync_user/${reader._id}`;
            console.log(`Syncing ${reader.email}`);
            try {
                const api_response = (await axios.get(url, {
                    headers: {
                        Authorization: `Bearer ${process.env.WORDPRESS_KEY}`
                    },
                    timeout: 10000
                })).data;
                if (config.debug) {
                    console.log(JSON.stringify(api_response, null, 2));
                }
            } catch (err) {
                console.error(err.toString());
            }
        }
    }
}

module.exports = {
    sync_user,
    sync_subscription,
    sync_readers_missing_in_wordpress
};