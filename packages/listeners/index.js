const config = require("config");
const restify = require("restify");
const corsMiddleware = require('restify-cors-middleware2')
const public_server = restify.createServer({
    name: config.api_name
});
const Reports = require("@revengine/reports");

const cors = corsMiddleware({
    origins: ['*'],
});

public_server.use(restify.plugins.bodyParser()); 
public_server.use(restify.plugins.queryParser()); 
public_server.use(cors.preflight);
public_server.use(cors.actual);
const touchbase = require("@revengine/mailer/touchbase");
const sync_wordpress = require("@revengine/sync/wordpress");
const ml = require("@revengine/ml");
const wordpress_auth = require("@revengine/wordpress_auth");
const JXPHelper = require("jxp-helper");
const apihelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });

// const woocommerce = require("./woocommerce");

public_server.post("/wp/woocommerce/subscription/update", touchbase.woocommerce_subscriptions_callback, async (req, res) => {
    // if (config.debug) {
        console.log(JSON.stringify(req.body, null, 2));
    // }
    const wordpress_user_id = req.body.subscription.customer_id;
    const data = await sync_wordpress.sync_user(wordpress_user_id);
    if (config.debug) console.log(data);
    const subscription_data = await sync_wordpress.sync_subscription(wordpress_user_id);
    if (config.debug) console.log(subscription_data);
    // Is this a new subscription?
    if (req.body.old === "pending" && req.body.new === "active") {
        
    }
    res.send({ status: "ok" });
});

public_server.post("/wp/wordpress/user/update", async (req, res) => {
    try {
        if (config.debug) console.log(JSON.stringify(req.body, null, 2));
        const wordpress_user_id = req.body.user.ID;
        const data = await sync_wordpress.sync_user(wordpress_user_id);
        if (config.debug) console.log(data);
        const reader = (await apihelper.get("reader", { "filter[wordpress_id]": req.body.user.data.ID, "fields": "_id" })).data.pop();
        if (!reader) throw "Reader not found";
        await wordpress_auth.sync_reader(reader._id);
        res.send({ status: "ok" });
        if (config.debug) console.log("Synced existing user", wordpress_user_id);
    } catch(err) {
        console.log(err);
        res.send({ status: "error" });
    }
});

public_server.post("/wp/wordpress/user/create", async (req, res) => {
    try {
        // Pause for 1 sec
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (config.debug) console.log(JSON.stringify(req.body, null, 2));
        console.log(JSON.stringify(req.body, null, 2));
        const wordpress_user_id = req.body.user.data.ID;
        const data = await sync_wordpress.sync_user(wordpress_user_id);
        if (config.debug) console.log(data);
        // const reader = (await apihelper.get("reader", { "filter[wordpress_id]": wordpress_user_id, "fields": "_id" })).data.pop();
        // if (!reader) throw "Reader not found";
        // const wordpressuser = (await apihelper.get("wordpressuser", { "filter[id]": wordpress_user_id })).data;
        // if (!wordpressuser) throw "Wordpressuser not found";
        // const list_ids = config.wp_auth.add_to_tbp_lists;
        // for (let list_id of list_ids) {
        //     const custom_fields = {};
        //     if (wordpressuser._dm_campaign_created_by_utm_source) {
        //         custom_fields.Source = wordpressuser._dm_campaign_created_by_utm_source;
        //     }
        //     if (wordpressuser._dm_campaign_created_by_utm_medium) {
        //         custom_fields.Medium = wordpressuser._dm_campaign_created_by_utm_medium;
        //     }
        //     if (wordpressuser._dm_campaign_created_by_utm_campaign) {
        //         custom_fields.Campaign = wordpressuser._dm_campaign_created_by_utm_campaign;
        //     }
        //     await wordpress_auth.add_reader_to_list(reader._id, list_id, custom_fields);
        // }
        res.send({ status: "ok" });
        if (config.debug) console.log("Synced new user", wordpress_user_id);
    } catch(err) {
        console.error(err);
        res.send({ status: "error", error: err.toString() });
    }
});

public_server.post("/wp/wordpress/user/delete", async (req, res) => {
    try {
        if (config.debug) console.log(JSON.stringify(req.body, null, 2));
        res.send({ status: "not implemented" });
    } catch(err) {
        console.error(err);
        res.send({ status: "error", error: err.toString() });
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

const protected_server = require("@revengine/http_server");

protected_server.get("/email/mailrun/:mailrun_id", async (req, res) => {
    try {
        const result = await touchbase.run_mailrun(req.params.mailrun_id);
        res.send(result);
    } catch(err) {
        res.status(500).send({ error: err.toString() });
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

protected_server.listen(config.listeners.protected_port || 3021, function () {
    console.log('%s listening at %s', protected_server.name, protected_server.url);
});