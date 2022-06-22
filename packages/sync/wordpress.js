const axios = require("axios");
const config = require("config");
require("dotenv").config();
const JXPHelper = require("jxp-helper");
const apihelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const wordpress_auth = require("@revengine/wordpress_auth");

const get_woocommerce_user = async (user_id) => {
    const username = process.env.WOOCOMMERCE_USERNAME;
    const password = process.env.WOOCOMMERCE_PASSWORD;
    const url = `${config.woocommerce.api}/customers/${user_id}`;
    const basic_auth = `Basic ${new Buffer.from(`${ username }:${ password }`, "utf8").toString("base64")}`;
    const res = await fetch(url, { headers: { 'Authorization': basic_auth }});
    return await res.json();
}

async function sync_user(wordpress_user_id) {
    try {
        const wpuser = (await axios.get(`${config.wordpress.revengine_api}/user/${wordpress_user_id}`, { headers: { Authorization: `Bearer ${process.env.WORDPRESS_KEY}` }})).data.data.pop();
        if (!wpuser) throw "User not found in Wordpress";
        const user = (await apihelper.postput("wordpressuser", "id", wpuser)).data;
        const reader = (await apihelper.get("reader", { "filter[wordpress_id]": user.id, "fields": "_id" })).data.pop();
        if (!reader) throw "Reader not found";
        // await wordpress_auth.sync_reader(reader._id);
        return user;
    } catch(err) {
        return Promise.reject(err);
    }
}

async function sync_subscription(wordpress_user_id) {
    const subscription = (await axios.get(`${config.wordpress.revengine_api}/woocommerce_subscriptions?customer_id=${wordpress_user_id}`, { headers: { Authorization: `Bearer ${process.env.WORDPRESS_KEY}` }})).data.data.pop();
    if (!subscription) {
        console.log("Subscription not found for user", wordpress_user_id);
        return null;
    }
    return (await apihelper.postput("woocommerce_subscription", "id", subscription)).data;
}

module.exports = {
    sync_user,
    sync_subscription,
};