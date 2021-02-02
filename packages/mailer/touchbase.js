const config = require("config");
const fetch = require("node-fetch");
const axios = require("axios");
require("dotenv").config();
const JXPHelper = require("jxp-helper");
const moment = require("moment");
const apihelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });

const get_woocommerce_user = async (user_id) => {
    const username = process.env.WOOCOMMERCE_USERNAME;
    const password = process.env.WOOCOMMERCE_PASSWORD;
    const url = `${config.woocommerce.api}/customers/${user_id}`;
    const basic_auth = `Basic ${new Buffer.from(`${ username }:${ password }`, "utf8").toString("base64")}`;
    const res = await fetch(url, { headers: { 'Authorization': basic_auth }});
    return await res.json();
}

// Apply rules to figure out which group to assign
// This must become dynamic at some point
const check_group = (data) => {
    if (config.touchbase.products_for_uber_deal.includes(data.line_items[0].name)) return "new_insider_uber_deal";
    return "new_insider";
}

const get_vouchertypes = async () => {
    return (await apihelper.get("vouchertype")).data;
}

const create_reader = async user => {
    console.log("Creating User");
    if (user.user && user.user.id) user = user.user;
    console.log(user);
    const wordpressuser = (await apihelper.postput("wordpressuser", "id", user)).data;
    console.log(wordpressuser);
    const reader = {
        wordpressuser_id: wordpressuser._id,
        email: wordpressuser.user_email.toLowerCase().trim(),
        wordpress_id: wordpressuser.id,
        first_name: wordpressuser.first_name,
        last_name: wordpressuser.last_name,
        display_name: wordpressuser.display_name,
    }
    if (wordpressuser.session_tokens) {
          reader.uas = [];
          for(token of Object.values(wordpressuser.session_tokens)) {
            reader.uas.push(token.ua);
        }
    }
    return (await apihelper.postput("reader", "email", reader)).data;
}

const get_reader = async user => {
    const reader = (await apihelper.get("reader", { "filter[wordpress_id]": user.user_id })).data;
    if (reader.length) return reader[0];
    // No reader? Create one
    return await create_reader(user);
}

const get_voucher = async (vouchertype, user_id) => {
    const voucher = (await apihelper.query("voucher", {
        "$and": [
            {
                "vouchertype_id": vouchertype._id
            },
            {
                "$or": [{ 
                    "reader_id": {
                        "$exists": false
                    }
                },
                {
                    "reader_id":  user_id
                }],
            },
            {
                "valid_from": {
                    "$gte": "2021-02-01"
                }
            },
            {
                "valid_to": {
                    "$lte": "2021-02-28"
                }
            }
        ]
    })).data.sort(voucher => voucher.reader_id ? 1 : -1).pop();
    if (!voucher.reader_id) {
        await apihelper.put("voucher", voucher._id, { "reader_id": user_id });
    }
    return voucher;
}

const group_actions = () => {
    const actions = {
        "new_insider": async data => {
            try {
                const transactional_id = config.touchbase.transactional_ids.new_insiders;
                const to = config.touchbase.override_to || data.user.email;
                const body = {
                    "To": [to],
                    "Data": {
                        "name": data.user.first_name,
                    },
                    "ConsentToTrack": "unchanged"
                }
                if (!config.touchbase.live) {
                    console.log(body);
                    return;
                }
                const result = await axios(`${config.touchbase.api}/transactional/smartemail/${transactional_id}/send`, {
                    method: "post",
                    data: body,
                    auth: {
                        username: process.env.TOUCHBASE_APIKEY,
                        password: 'x'
                    },
                });
                if (result.data.Code) throw result.data;
            } catch(err) {
                return Promise.reject(err);
            }
        },
        "new_insider_uber_deal": async data => {
            try {
                const transactional_id = config.touchbase.transactional_ids.new_insider_uber_deal;
                const vouchertypes = await get_vouchertypes();
                const vouchers = {};
                for (let vouchertype of vouchertypes) {
                    vouchers[vouchertype.code] = (await get_voucher(vouchertype, data.reader._id)).code;
                }
                const d = Object.assign({
                    name: data.user.first_name
                }, vouchers);
                const to = config.touchbase.override_to || data.user.email;
                const body = {
                    "To": [to],
                    "Data": d,
                    "ConsentToTrack": "unchanged"
                }
                if (!config.touchbase.live) {
                    console.log(body);
                    return;
                }
                const result = await axios(`${config.touchbase.api}/transactional/smartemail/${transactional_id}/send`, {
                    method: "post",
                    data: body,
                    auth: {
                        username: process.env.TOUCHBASE_APIKEY,
                        password: 'x'
                    },
                });
                if (result.data.Code) throw result.data;
            } catch(err) {
                return Promise.reject(err);
            }
        }
    }
    return actions;
}

exports.woocommerce_subscriptions_callback = async (req, res) => {
    try {
        const data = req.body.data;
        // console.log(req.body);
        data.user = await get_woocommerce_user(data.user_id);
        data.reader = await get_reader(data);
        const group = check_group(data);
        const group_action = group_actions(group);
        await group_action[group](data);
        res.send({ status: "ok" });
    } catch(err) {
        console.error(err);
        res.send(500, { status: "error" });
    }
};

exports.woocommerce_subscriptions_zapier_callback = async (req, res) => {
    try {
        const data = JSON.parse(req.body.data);
        // console.log(req.body);
        data.user = await get_woocommerce_user(data.user_id);
        data.reader = await get_reader(data);
        const group = check_group(data);
        const group_action = group_actions(group);
        await group_action[group](data);
        res.send({ status: "ok" });
    } catch(err) {
        console.error(err);
        res.send(500, { status: "error" });
    }
};

// Can be called as restify middleware or asynchronously
exports.monthly_uber_mail = async (req, res) => {
    try {
        const per_page = 500;
        const transactional_id = config.touchbase.transactional_ids.uber_monthly_mail;
        const mailrun = (await apihelper.postput("mailrun", "code", { state: "running", code: `monthly-uber-mail-${moment().format("YYYY-MM")}`, name: `Monthly Uber Mail ${moment().format("MMM YYYY")}`})).data;
        if (res) res.send({ status: "ok", message: "Mail Run running", mailrun_id: mailrun._id });
        const sent_already = (await apihelper.get("sentmail", { "filter[mailrun_id]": mailrun._id, "fields": "reader_id", "populate[reader]": "wordpress_id" })).data.map(sentmail => sentmail.reader.wordpress_id);
        const vouchertypes = await get_vouchertypes();
        // Get list of readers that have active memberships to the relevant product
        const count = (await axios.get(`${config.wordpress.revengine_api}/woocommerce_memberships?status=active&per_page=1`, { headers: { Authorization: `Bearer ${process.env.WORDPRESS_KEY}` }})).data.total_count;
        console.log(`Total active memberships: ${count}`);
        for (let page = 1; page <= Math.ceil(count / per_page); page++) {
            const membership_data = (await axios.get(`${config.wordpress.revengine_api}/woocommerce_memberships?status=active&per_page=${per_page}&page=${page}`, { headers: { Authorization: `Bearer ${process.env.WORDPRESS_KEY}` }})).data;
            // console.log(memberships.data.slice(0, 2));
            const relevant_memberships = membership_data.data.filter(membership => (membership.product)).map(membership => {
                const id = Number(membership.customer_id)
                return {
                    user_id: id,
                    product: membership.product.name,
                    product_slug: membership.product.slug,
                    product_id: Number(membership.product.id),
                    user: Object.assign(membership.user, { id, user_id: id, wordpress_id: id })
                }
            })
            .filter(user => config.touchbase.products_for_uber_deal.includes(user.product)) // Must have a product
            .filter(user => !sent_already.includes(user.user_id)) // Make sure we haven't sent already
            // .filter(user => (user.user && user.user.email)) // Must have a user
            ; 
            console.log(relevant_memberships.length);
            // Ensure they exist in the system
            const readers = [];
            for (let membership of relevant_memberships) {
                const reader = await get_reader(membership.user);
                readers.push(reader);
            }

            // Assign them all Uber codes
            const results = {
                success: [],
                error: []
            };
            for (let reader of readers) {
                try {
                    // Make sure we're still in a running state
                    const mailrun_state = (await apihelper.getOne("mailrun", mailrun._id)).data.state;
                    if (mailrun_state !== "running") {
                        console.log("Report no longer running, exiting");
                        return;
                    }
                    const vouchers = {};
                    for (let vouchertype of vouchertypes) {
                        vouchers[vouchertype.code] = (await get_voucher(vouchertype, reader._id)).code;
                    }
                    reader.vouchers = vouchers;
                    // Send them the email
                    const d = Object.assign({
                        name: reader.first_name
                    }, vouchers);
                    const to = config.touchbase.override_to || reader.email;
                    const body = {
                        "To": [to],
                        "Data": d,
                        "ConsentToTrack": "unchanged"
                    }
                    // Check that we haven't already sent this email out
                    const sent_check = (await apihelper.get("sentmail", { "filter[reader_id]": reader._id, "filter[mailrun_id]": mailrun._id })).count;
                    if (sent_check) {
                        console.log(`Skipping ${reader.email}`)
                        continue;
                    }
                    let result = null;
                    if (!config.touchbase.live) {
                        console.log(body);
                        result = { state: "simulated", body }
                    } else {
                        result = await axios(`${config.touchbase.api}/transactional/smartemail/${transactional_id}/send`, {
                            method: "post",
                            data: body,
                            auth: {
                                username: process.env.TOUCHBASE_APIKEY,
                                password: 'x'
                            },
                        });
                        if (result.data.Code) throw result.data;
                    }
                    await apihelper.post("sentmail", { 
                        to: reader.email, 
                        data: body, 
                        response: result.data, 
                        status: "success", 
                        transactional_id, 
                        mailrun_id: mailrun._id, 
                        reader_id: reader._id 
                    });
                    results.success.push(reader.email);
                } catch(err) {
                    console.error(err);
                    results.error.push(reader.email);
                    await apihelper.post("sentmail", { 
                        to: reader.email, 
                        response: err.toString(), 
                        status: "error",
                        transactional_id, 
                        mailrun_id: mailrun._id, 
                        reader_id: reader._id 
                    });
                }
            }
        }
        // Report
        await apihelper.put("mailrun", mailrun._id, { running: false, data: results, end_time: new Date() });
        return true;
    } catch(err) {
        console.error(err);
        if (res) {
            res.send(err);
        } else {
            return Promise.reject();
        }
    }
}