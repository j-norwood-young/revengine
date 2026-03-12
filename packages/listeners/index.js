import config from "config";
import restify from "restify";
import errs from 'restify-errors';
import corsMiddleware from 'restify-cors-middleware2';
import protected_server from "@revengine/http_server";
import * as Reports from "@revengine/reports";
import esclient from "@revengine/common/esclient.js";

const public_server = restify.createServer({
    name: config.api_name
});
protected_server.use(restify.plugins.bodyParser());

const cors = corsMiddleware({
    origins: ['*'],
});

public_server.use(restify.plugins.bodyParser());
public_server.use(restify.plugins.queryParser());
public_server.use(cors.preflight);
public_server.use(cors.actual);
import touchbase from "@revengine/mailer/touchbase.js";
import { prediction_dump } from "@revengine/ml";
import JXPHelper from "jxp-helper";
import autogen_newsletter from "@revengine/autogen_newsletter";

const apihelper = new JXPHelper({ server: process.env.API_SERVER || config.api.server, apikey: process.env.APIKEY });

const deprecated = async (req, res) => {
    try {
        res.send({ status: "deprecated" });
    } catch (err) {
        console.error(err);
    }
}

public_server.get("/test", async (req, res) => {
    res.send({ status: "ok" });
});

public_server.post("/wp/woocommerce/subscription/update", deprecated);

public_server.post("/wp/wordpress/user/update", deprecated);

public_server.post("/wp/wordpress/user/create", deprecated);

public_server.post("/wp/wordpress/user/delete", deprecated);

public_server.post("/wp/reader/labels", async (req, res) => {
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
    } catch (err) {
        console.error(err);
        res.send(500, { status: "error", error: err.toString() });
    }
});

protected_server.get("/wp/readers/labels", async (req, res) => {
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
    } catch (err) {
        console.error(err);
        res.send(500, { status: "error", error: err.toString() });
    }
});

public_server.post("/wp/test", async (req, res) => {
    console.log({ request: req.body });
    res.send({ status: "ok" });
});

public_server.post("/woocommerce/subscriptions/zapier/callback", deprecated);

public_server.post("/ml/prediction_dump", prediction_dump);

public_server.listen(config.listeners.public_port || 3020, function () {
    console.log('%s listening at %s', public_server.name, public_server.url);
});

protected_server.get("/email/mailrun/:mailrun_id", async (req, res) => {
    try {
        const result = await touchbase.run_mailrun(req.params.mailrun_id);
        res.send(result);
    } catch (err) {
        res.send(500, { error: err.toString() });
    }
});

protected_server.post("/add_autologin", deprecated);

public_server.get("/autogen_newsletter", async (req, res) => {
    try {
        const section_query = req.query.sections || "";
        const sections = section_query.split(",").map(topic => topic.trim());
        const result = await autogen_newsletter.generate(sections);
        res.send(result);
    } catch (err) {
        res.send(500, { error: err.toString() });
    }
});

protected_server.get("/email/automated/monthly_uber_mail", deprecated);

protected_server.get("/report/logged_in_users", async (req, res) => {
    try {
        const Sessions = new Reports.Sessions();
        const result = await Sessions.get_logged_in_users(req.query?.period);
        res.send(result);
    } catch (err) {
        res.send(500, { error: err.toString() });
    }
});

protected_server.get("/report/users_by_utm_source", async (req, res) => {
    try {
        if (!req.query.utm_source) throw "utm_source is required";
        const Sessions = new Reports.Sessions();
        const result = await Sessions.get_users_by_utm_source(req.query.utm_source, req.query?.period);
        res.send(result);
    } catch (err) {
        res.send(500, { error: err.toString() });
    }
});

protected_server.get("/report/users_by_label", async (req, res) => {
    try {
        if (!req.query.label) throw "label is required";
        const Sessions = new Reports.Sessions();
        const result = await Sessions.get_users_by_label(req.query.label, req.query?.period);
        res.send(result);
    } catch (err) {
        res.send(500, { error: err.toString() });
    }
});

protected_server.get("/report/users_by_segment", async (req, res) => {
    try {
        if (!req.query.segment) throw "segment is required";
        const Sessions = new Reports.Sessions();
        const result = await Sessions.get_users_by_segment(req.query.segment, req.query?.period);
        res.send(result);
    } catch (err) {
        res.send(500, { error: err.toString() });
    }
});

protected_server.get("/sailthru/queue", deprecated);
protected_server.get("/sailthru/full_queue", deprecated);
protected_server.get("/sailthru/job_status/:job_id", deprecated);
protected_server.get("/sailthru/push/:uid/:page", deprecated);
protected_server.post("/sailthru/subscribe_email_to_list", deprecated);
protected_server.post("/sailthru/subscribe_to_list", deprecated);
protected_server.post("/sailthru/unsubscribe_email_from_list", deprecated);
protected_server.post("/sailthru/unsubscribe_from_list", deprecated);
protected_server.get("/sailthru/get_lists", deprecated);
protected_server.get("/sailthru/get_users_in_list", deprecated);
protected_server.post("/sailthru/sync_user", deprecated);
protected_server.get("/wordpress/sync_readers_missing_in_wordpress", deprecated);

protected_server.post("/elasticsearch", async (req, res) => {
    try {
        const result = await esclient.search(req.body);
        res.send(result);
    } catch (err) {
        console.error(err);
        res.send(new errs.InternalServerError(err));
    }
});

protected_server.listen(config.listeners.protected_port || 3021, function () {
    console.log('%s listening at %s', protected_server.name, protected_server.url);
});