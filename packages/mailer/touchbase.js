const config = require("config");
const fetch = require("node-fetch");
const axios = require("axios");
require("dotenv").config();
const JXPHelper = require("jxp-helper");
const moment = require("moment");
const apihelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const auth = {
    username: process.env.TOUCHBASE_APIKEY,
    password: "x"
};

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
    if (data.subscription && data.subscription.meta_data) {
        const ossc = data.subscription.meta_data.find(meta_data => meta_data.key === "ossc_tracking");
        if (ossc && ossc.value && ossc.value.coupon && ossc.value.coupon === "youth") return "youth_deal";
    }
    if (config.touchbase.products_for_uber_deal.includes(data.line_items[0].name)) return "new_insider_uber_deal";
    return "new_insider";
}

const get_vouchertypes = async () => {
    return (await apihelper.get("vouchertype")).data;
}

const create_reader = async user => {
    console.log("Creating User");
    if (user.user && user.user.id) user = user.user;
    if (user.email && !user.user_email) {
        user.user_email = user.email;
    }
    const wordpressuser = (await apihelper.postput("wordpressuser", "id", user)).data;
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
                    "$gte": moment().startOf("month").format("YYYY-MM-DD")
                }
            },
            {
                "valid_to": {
                    "$lte": moment().endOf("month").format("YYYY-MM-DD")
                }
            }
        ]
    })).data.sort(voucher => voucher.reader_id ? 1 : -1).pop();
    if (!voucher) throw("No available vouchers found");
    if (!voucher.reader_id) {
        await apihelper.put("voucher", voucher._id, { "reader_id": user_id });
    }
    return voucher;
}

const group_actions = () => {
    const actions = {
        "new_insider": async data => {
            try {
                const reader_data = {
                    "wordpress_id": data.reader.wordpress_id,
                    "revengine_id": data.reader._id,
                    "email": data.reader.email
                }
                console.log(reader_data);
                const transactional_id = config.touchbase.transactional_ids.new_insiders;
                const to = config.touchbase.override_to || data.user.email;
                const body = {
                    "To": [to],
                    "Data": {
                        "name": data.user.first_name,
                        "auto_login_id": wordpress_auth.encrypt(reader_data)
                    },
                    "ConsentToTrack": "unchanged"
                }
                if (config.touchbase.bcc) {
                    body.Bcc = config.touchbase.bcc;
                }
                if (!config.touchbase.live) {
                    console.log(body);
                    return;
                }
                const result = await axios(`${config.touchbase.api}/transactional/smartemail/${transactional_id}/send`, {
                    method: "post",
                    data: body,
                    auth,
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
                if (config.touchbase.bcc) {
                    body.Bcc = config.touchbase.bcc;
                }
                if (!config.touchbase.live) {
                    console.log(body);
                    return;
                }
                const result = await axios(`${config.touchbase.api}/transactional/smartemail/${transactional_id}/send`, {
                    method: "post",
                    data: body,
                    auth,
                });
                if (result.data.Code) throw result.data;
            } catch(err) {
                return Promise.reject(err);
            }
        },
        "youth_deal": async data => {
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
                if (config.touchbase.bcc) {
                    body.Bcc = config.touchbase.bcc;
                }
                if (!config.touchbase.live) {
                    console.log(body);
                    return;
                }
                const result = await axios(`${config.touchbase.api}/transactional/smartemail/${transactional_id}/send`, {
                    method: "post",
                    data: body,
                    auth,
                });
                if (result.data.Code) throw result.data;
            } catch(err) {
                return Promise.reject(err);
            }
        }
    }
    return actions;
}

const sync_user = async user_id => {
    const user = (await axios.get(`${config.wordpress.revengine_api}/user/${user_id}`, { headers: { Authorization: `Bearer ${process.env.WORDPRESS_KEY}` }})).data.data.pop();
    if (!user) return Promise.reject("User not found in Wordpress");
    return (await apihelper.postput("wordpressuser", "id", user)).data;
}

const sync_subscription = async user_id => {
    const subscription = (await axios.get(`${config.wordpress.revengine_api}/woocommerce_subscriptions?customer_id=${user_id}`, { headers: { Authorization: `Bearer ${process.env.WORDPRESS_KEY}` }})).data.data.pop();
    if (!subscription) {
        console.log("Subscription not found for user", user_id);
        return null;
    }
    return (await apihelper.postput("woocommerce_subscription", "id", subscription)).data;
}

exports.woocommerce_subscriptions_callback = async (req, res, next) => {
    try {
        const subscription = req.body.subscription;
        await sync_user(subscription.customer_id);
        await sync_subscription(subscription.customer_id);
        // await get_woocommerce_user(data.user_id);
        // data.reader = await get_reader(data);
        // const group = check_group(data);
        // const group_action = group_actions(group);
        // await group_action[group](data);
        if (next) next();
    } catch(err) {
        console.error(err);
        res.send(500, { status: "error" });
    }
};

exports.woocommerce_subscriptions_zapier_callback = async (req, res) => {
    try {
        const data = JSON.parse(req.body.data);
        // console.log(req.body);
        await sync_user(data.user_id);
        data.subscription = await sync_subscription(data.user_id);
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
        // Assign them all Uber codes
        const results = {
            success: [],
            error: []
        };
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
                            auth,
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

exports.test_monthly_uber_mail = async (reader_email, to, tid) => {
    try {
        const vouchertypes = await get_vouchertypes();
        const transactional_id = config.touchbase.transactional_ids[tid];
        console.log({ reader_email });
        const reader = (await apihelper.get("reader", { "filter[email]": reader_email })).data.pop();
        if (!reader) throw "Could not find reader";
        const vouchers = {};
        for (let vouchertype of vouchertypes) {
            vouchers[vouchertype.code] = (await get_voucher(vouchertype, reader._id)).code;
        }
        reader.vouchers = vouchers;
        // Send them the email
        const d = Object.assign({
            name: reader.first_name
        }, vouchers);
        const body = {
            "To": [to],
            "Data": d,
            "ConsentToTrack": "unchanged"
        }
        let result = null;
        if (!config.touchbase.live) {
            console.log(body);
            result = { state: "simulated", body }
        } else {
            result = await axios(`${config.touchbase.api}/transactional/smartemail/${transactional_id}/send`, {
                method: "post",
                data: body,
                auth,
            });
            if (result.data.Code) throw result.data;
        }
        return result;
    } catch(err) {
        console.error(err);
        return Promise.reject(err);
    }
}

const run_transactional = async (reader_email, to, tid) => {
    try {
        const transactional = (await apihelper.getOne("touchbasetransactional", tid)).data;
        const reader = (await apihelper.get("reader", { "filter[email]": reader_email })).data.pop();
        let d;
        if (transactional.data_fn) {
            const fn = new Function(transactional.data_fn);
            d = await fn()({ get_voucher, get_vouchertypes, reader });
        } else {
            d = {
                name: reader.first_name
            };
        }
        const body = {
            "To": [to],
            "Data": d,
            "ConsentToTrack": "unchanged"
        }
        if (transactional.bcc) {
            body.Bcc = transactional.bcc;
        }
        let result = null;
        if (!config.touchbase.live) {
            console.log(body);
            result = { state: "simulated", body }
        } else {
            if (config.debug) {
                console.log({ body });
            }
            result = await axios(`${config.touchbase.api}/transactional/smartemail/${transactional.touchbase_transactional_id}/send`, {
                method: "post",
                data: body,
                auth,
            });
            if (config.debug) {
                console.log(result.data);
            }
            if (result.data.Code) throw result.data;
        }
        return result;
    } catch(err) {
        console.error(err);
        return Promise.reject(err);
    }
}

const run_mailrun = async mailrun_id => {
    try {
        const mailrun = (await apihelper.getOne("mailrun", mailrun_id, { "populate[queued]": "email" })).data;
        if (mailrun.state !== "due") {
            return Promise.reject(`Mailrun is in state ${mailrun.state}, cannot run`);
        }
        await apihelper.put("mailrun", mailrun_id, { state: "running", start_time: new Date() });
        for (let reader of mailrun.queued) {
            try {
                await this.run_transactional(reader.email, reader.email, mailrun.touchbasetransactional_id);
                await apihelper.call("mailrun", "move_to_sent", { mailrun_id, reader_id: reader._id });
                await apihelper.put("mailrun", mailrun_id, { state: "running" });
            } catch(err) {
                await apihelper.call("mailrun", "move_to_failed", { mailrun_id, reader_id: reader._id });
                console.error(`Error sending to ${reader.email}`);
                console.error(err);
            }
        }
        await apihelper.put("mailrun", mailrun_id, { state: "complete", end_time: new Date() });
    } catch(err) {
        console.error(err);
        try {
            await apihelper.put("mailrun", mailrun_id, { state: "failed", data: { error: err.toString() } });
        } catch(err) {
            console.error(err);
        }
        return Promise.reject(err);
    }
}

const create_list = async(list_name) => {
    const client = (await axios.get(`${config.touchbase.api}/clients.json`, { auth })).data.pop();
    const json = {
        "Title": list_name,
        "UnsubscribeSetting": "OnlyThisList",
        "ConfirmedOptIn": false,
    }
    list_id = (await axios.post(`${config.touchbase.api}/lists/${client.ClientID}.json`, json, { auth })).data;
    return list_id;
}

const ensure_custom_fields = async(list_id, fields) => {
    const existing_fields = (await axios.get(`${config.touchbase.api}/lists/${list_id}/customfields.json`, { auth })).data;
    const existing_field_names = existing_fields.map(f => f.FieldName);
    for (let field of fields) {
        if (!existing_field_names.includes(field)) {
            console.log(`Creating custom field ${field} for list ${list_id}`);
            const field_data = {
                "FieldName": field,
                "DataType": "Text",
                "VisibleInPreferenceCenter": false
            }
            await axios.post(`${config.touchbase.api}/lists/${list_id}/customfields.json`, field_data, { auth });
        }
    }
}

const add_readers_to_list = async (readers, list_id) => {
    const result = [];
    // console.log(readers);
    while (readers.length) {
        const json = {
            "Subscribers": readers.splice(0, 1000).map(reader => {
                const CustomFields = [];
                for (let key in reader.custom_fields) {
                    CustomFields.push({
                        "Key": key,
                        "Value": reader.custom_fields[key]
                    });
                }
                return {
                    EmailAddress: reader.email,
                    Name: `${reader.first_name || ""} ${reader.last_name || ""}`,
                    CustomFields,
                    ConsentToTrack: "Yes"
                }
            })
        }
        // console.log(JSON.stringify(json, null, 2));
        try {
            result.push((await axios.post(`${config.touchbase.api}/subscribers/${list_id}/import.json`, json, { auth })).data);
        } catch(err) {
            console.error(JSON.stringify(err.response.data, null, 2));
        }
    }
    return result;
}

const get_touchbase_lists = async () => {
    const client = (await axios.get(`${config.touchbase.api}/clients.json`, { auth })).data.pop();
    const lists = (await axios.get(`${config.touchbase.api}/clients/${client.ClientID}/lists.json`, { auth })).data;
    return {lists, client};
}

const get_touchbase_list = async(list_id) => {
    const list = (await axios.get(`${config.touchbase.api}/lists/${list_id}.json`, { auth })).data;
    return list;
}

const get_transactional_templates = async () => {
    const templates = (await axios.get(`${config.touchbase.api}/transactional/smartEmail?status=active`, { auth })).data;
    return templates;
}

exports.run_mailrun = run_mailrun;
exports.run_transactional = run_transactional;
exports.add_readers_to_list = add_readers_to_list;
exports.create_list = create_list;
exports.get_touchbase_lists = get_touchbase_lists;
exports.get_touchbase_list = get_touchbase_list;
exports.get_transactional_templates = get_transactional_templates;
exports.get_voucher = get_voucher;
exports.ensure_custom_fields = ensure_custom_fields;