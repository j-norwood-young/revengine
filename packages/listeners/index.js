const config = require("config");
const restify = require("restify");
const errs = require('restify-errors');
const corsMiddleware = require('restify-cors-middleware2')
const public_server = restify.createServer({
    name: config.api_name
});
const protected_server = require("@revengine/http_server");
protected_server.use(restify.plugins.bodyParser()); 
const Reports = require("@revengine/reports");

const cors = corsMiddleware({
    origins: ['*'],
});

public_server.use(restify.plugins.bodyParser()); 
public_server.use(restify.plugins.queryParser()); 
public_server.use(cors.preflight);
public_server.use(cors.actual);
const touchbase = require("@revengine/mailer/touchbase");
const sailthru = require("@revengine/mailer/sailthru");
const sync_wordpress = require("@revengine/sync/wordpress");
const ml = require("@revengine/ml");
const wordpress_auth = require("@revengine/wordpress_auth");
const JXPHelper = require("jxp-helper");
const apihelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });

// const woocommerce = require("./woocommerce");

public_server.post("/wp/woocommerce/subscription/update", touchbase.woocommerce_subscriptions_callback, async (req, res) => {
    try {
        res.send({ status: "ok" });
        if (config.debug) {
            console.log(JSON.stringify(req.body, null, 2));
        }
        const wordpress_user_id = req.body.subscription.customer_id;
        const data = await sync_wordpress.sync_user(wordpress_user_id);
        if (config.debug) console.log(data);
        const subscription_data = await sync_wordpress.sync_subscription(wordpress_user_id);
        if (config.debug) console.log(subscription_data);
        // Is this a new subscription?
        if (req.body.old === "pending" && req.body.new === "active") {
            
        }
    } catch(err) {
        console.error(err);
    }
});

public_server.post("/wp/wordpress/user/update", async (req, res) => {
    try {
        res.send({ status: "ok" });
        if (config.debug) console.log(JSON.stringify(req.body, null, 2));
        const wordpress_user_id = req.body.user.ID;
        const data = await sync_wordpress.sync_user(wordpress_user_id);
        if (config.debug) console.log(data);
        const reader = (await apihelper.get("reader", { "filter[wordpress_id]": req.body.user.data.ID, "fields": "_id" })).data.pop();
        if (!reader) throw "Reader not found";
        await wordpress_auth.sync_reader(reader._id);
        if (config.debug) console.log("Synced existing user", wordpress_user_id);
    } catch(err) {
        console.error(err);
    }
});

public_server.post("/wp/wordpress/user/create", async (req, res) => {
    try {
        res.send({ status: "ok" });
        // Pause for 1 sec
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (config.debug) console.log(JSON.stringify(req.body, null, 2));
        const wordpress_user_id = req.body.user.data.ID;
        const data = await sync_wordpress.sync_user(wordpress_user_id);
        if (config.debug) console.log(data);
        if (config.debug) console.log("Synced new user", wordpress_user_id);
    } catch(err) {
        console.error(err);
    }
});

public_server.post("/wp/wordpress/user/delete", async (req, res) => {
    try {
        if (config.debug) console.log(JSON.stringify(req.body, null, 2));
        res.send({ status: "not implemented" });
    } catch(err) {
        console.error(err);
        res.send(500, { status: "error", error: err.toString() });
    }
});

public_server.post("/wp/reader/labels", async(req, res) => {
    try {
        const wordpress_id = Number(req.body.user_id);
        if (!wordpress_id) throw "No user_id";
        const user_data = (await apihelper.aggregate("reader", [
            {
                $match: {
                    wordpress_id: Number(wordpress_id),
                },
            },
            {
                $lookup: {
                    from: "labels",
                    localField: "label_id",
                    foreignField: "_id",
                    as: "labels"
                }
            },
            {
                $lookup: {
                    from: "segmentations",
                    localField: "segmentation_id",
                    foreignField: "_id",
                    as: "segments"
                }
            },
            { 
                $project: { 
                    "labels.code": 1,
                    "segments.code": 1,
                } 
            },
        ])).data.pop();
        if (!user_data) throw "Reader not found";
        const data = {
            wordpress_id,
            labels: [],
            segments: [],
        }
        if (user_data) {
            if (user_data.labels) {
                data.labels = user_data.labels.map(label => label.code);
            }
            if (user_data.segments) {
                data.segments = user_data.segments.map(segment => segment.code);
            }
        }
        if (config.debug) console.log(data);
        res.send(data);
    } catch(err) {
        console.error(err);
        res.send(500, { status: "error", error: err.toString() });
    }
});

protected_server.get("/wp/readers/labels", async(req, res) => {
    try {
        const raw_data = (await apihelper.aggregate("reader", [
            {
                $lookup: {
                    from: "labels",
                    localField: "label_id",
                    foreignField: "_id",
                    as: "labels"
                }
            },
            {
                $lookup: {
                    from: "segmentations",
                    localField: "segmentation_id",
                    foreignField: "_id",
                    as: "segments"
                }
            },
            { 
                $project: {
                    "_id": false,
                    "labels.code": 1,
                    "segments.code": 1,
                } 
            },
        ])).data;
        if (!raw_data.length) throw "Data not found";
        const data = raw_data.map(user_data => {
            const user = {
                wordpress_id: user_data.wordpress_id,
                labels: [],
                segments: [],
            }
            if (user_data) {
                if (user_data.labels) {
                    user.labels = user_data.labels.map(label => label.code);
                }
                if (user_data.segments) {
                    user.segments = user_data.segments.map(segment => segment.code);
                }
            }
            return user;
        })
        .filter(user => user.labels.length || user.segments.length);
        if (config.debug) console.log(data.slice(0, 10));
        res.send(data);
    } catch(err) {
        console.error(err);
        res.send(500, { status: "error", error: err.toString() });
    }
});

public_server.post("/wp/test", (req, res) => {
    console.log({ request: req.body });
    res.send({ status: "ok" });
});

public_server.post("/woocommerce/subscriptions/zapier/callback", touchbase.woocommerce_subscriptions_zapier_callback);

public_server.post("/ml/prediction_dump", ml.prediction_dump);

public_server.listen(config.listeners.public_port || 3020, function () {
    console.log('%s listening at %s', public_server.name, public_server.url);
});

protected_server.get("/email/mailrun/:mailrun_id", async (req, res) => {
    try {
        const result = await touchbase.run_mailrun(req.params.mailrun_id);
        res.send(result);
    } catch(err) {
        res.send(500, { error: err.toString() });
    }
});

protected_server.post("/add_autologin", async (req, res) => {
    try {
        const user_id = req.body.user_id;
        const tbp_list_id = req.body.list_id;
        if (!user_id) throw "No user_id";
        if (!tbp_list_id) throw "No list_id";
        const list = (await apihelper.get("touchbaselist", { "filter[list_id]": tbp_list_id })).data.pop();
        if (!list) throw "List not found";
        await wordpress_auth.force_sync_reader(user_id, list._id);
        res.send({ status: "ok" });
    } catch(err) {
        res.send(500, { error: err.toString() });
    }
});

public_server.get("/autogen_newsletter", async (req, res) => {
    const autogen_newsletter = require("@revengine/autogen_newsletter");
    try {
        const section_query = req.query.sections || "";
        const sections = section_query.split(",").map(topic => topic.trim());
        const result = await autogen_newsletter.generate(sections);
        res.send(result);
    } catch(err) {
        res.send(500, { error: err.toString() });
    }
});

protected_server.get("/email/automated/monthly_uber_mail", touchbase.monthly_uber_mail);

protected_server.get("/report/logged_in_users", async (req, res) => {
    try {
        const Sessions = new Reports.Sessions();
        const result = await Sessions.get_logged_in_users(req.query?.period);
        res.send(result);
    } catch(err) {
        res.send(500, { error: err.toString() });
    }
});

protected_server.get("/report/users_by_utm_source", async (req, res) => {
    try {
        if (!req.query.utm_source) throw "utm_source is required";
        const Sessions = new Reports.Sessions();
        const result = await Sessions.get_users_by_utm_source(req.query.utm_source, req.query?.period);
        res.send(result);
    } catch(err) {
        res.send(500, { error: err.toString() });
    }
});

protected_server.get("/report/users_by_label", async (req, res) => {
    try {
        if (!req.query.label) throw "label is required";
        const Sessions = new Reports.Sessions();
        const result = await Sessions.get_users_by_label(req.query.label, req.query?.period);
        res.send(result);
    } catch(err) {
        res.send(500, { error: err.toString() });
    }
});

protected_server.get("/report/users_by_segment", async (req, res) => {
    try {
        if (!req.query.segment) throw "segment is required";
        const Sessions = new Reports.Sessions();
        const result = await Sessions.get_users_by_segment(req.query.segment, req.query?.period);
        res.send(result);
    } catch(err) {
        res.send(500, { error: err.toString() });
    }
});

protected_server.get("/sailthru/segment_update/test", sailthru.serve_segments_test);
protected_server.get("/sailthru/update_job/test", sailthru.serve_update_job_test);
protected_server.get("/sailthru/job_status/:job_id", sailthru.serve_job_status);
protected_server.get("/sailthru/segment_update/:page", sailthru.serve_segments_paginated);
protected_server.get("/sailthru/queue_all_jobs", sailthru.serve_queue_all_jobs);
protected_server.post("/sailthru/subscribe_email_to_list", async (req, res) => {
    try {
        const email = req.body.email;
        const list_name = req.body.list_name;
        if (!email) throw "No email";
        if (!list_name) throw "No list_name";
        const result = await sailthru.subscribe_email_to_list(email, list_name);
        res.send(result);
        // res.send({ status: "ok" });
    } catch(err) {
        res.send(500, { error: err.toString() });
    }
})
protected_server.post("/sailthru/unsubscribe_email_from_list", async (req, res) => {
    try {
        const email = req.body.email;
        const list_name = req.body.list_name;
        if (!email) throw "No email";
        if (!list_name) throw "No list_name";
        const result = await sailthru.unsubscribe_email_from_list(email, list_name);
        res.send(result);
        // res.send({ status: "ok" });
    } catch(err) {
        res.send(500, { error: err.toString() });
    }
})

protected_server.get("/sailthru/get_lists", async (req, res) => {
    try {
        const lists = await sailthru.get_lists();
        res.send({ lists });
    } catch(err) {
        res.send(500, { error: err.toString() });
    }
})

protected_server.post("/sailthru/sync_user", async (req, res) => {
    try {
        const email = req.body.email;
        const user_id = req.body.user_id;
        if (!email && !user_id) throw "No email or user_id";
        let result;
        if (email) {
            result = await sailthru.sync_user_by_email(email);
        } else {
            result = await sailthru.sync_user_by_wordpress_id(user_id);
        }
        res.send(result);
    } catch(err) {
        res.send(500, { error: err.toString() });
    }
})

protected_server.get("/wordpress/sync_readers_missing_in_wordpress", async (req, res) => {
    try {
        await sync_wordpress.sync_readers_missing_in_wordpress();
        res.send({ status: "ok" });
    } catch(err) {
        console.error(err);
        res.send(new errs.InternalServerError(err));
    }
});

protected_server.listen(config.listeners.protected_port || 3021, function () {
    console.log('%s listening at %s', protected_server.name, protected_server.url);
});