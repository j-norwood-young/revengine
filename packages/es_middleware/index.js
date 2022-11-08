const config = require("config");
const restify = require("restify");
const server = restify.createServer();
const restler = require("restler-q");
const JXPHelper = require("jxp-helper");
const apihelper = new JXPHelper({ server: config.api });
server.use(restify.plugins.authorizationParser());
const esclient = require("@revengine/common/esclient");

// Log in to our API (for security and stuff)
server.use(async (req, res, next) => {
    try {
        console.log(`${config.api}/login`);
        const login = await restler.post(`${config.api}/login`, { data: { email: req.authorization.basic.username, password: req.authorization.basic.password }});
        req.apikey = login.apikey;
        req.apihelper = new JXPHelper({ server: config.api, apikey: login.apikey });
        next();
    } catch(err) {
        console.error(err);
        res.send(401, { error: err });
    }
})

// Set up our opts field
server.use((req, res, next) => {
    req.opts = {};
    next();
})

// Fetch our user, if we need one
server.use(async (req, res, next) => {
    if(!req.params.user_email) {
        return next();
    }
    try {
        req.opts.reader = (await req.apihelper.get("reader", { "filter[email]": req.params.user_email, "fields": "email,wordpress_id" })).data.pop();
        if (!req.opts.reader) {
            return res.send(404, "User not found");
        }
        if (!req.opts.reader.wordpress_id) throw ("User does not have a Wordpress ID");
        next();
    } catch (err) {
        console.error(err);
        res.send(500, { error: err });
    }
})

server.get("/test", async (req, res, next) => {
    try {
        console.log("Got test")
        res.send("Yo");
        next();
    } catch(err) {
        console.error(err);
    }
});

server.get("/user/:user_email", async(req, res, next) => {
    try {
        let monthly = {};
        let last_30_days = {};
        const article_progress_monthly = require("./elasticsearch/article_progress_monthly");
        const article_progress_30days = require("./elasticsearch/article_progress_30days");
        const article_time_spent = require("./elasticsearch/article_time_spent");
        const article_hits = require("./elasticsearch/article_hits");
        monthly.article_progress = await article_progress_monthly.transform(await esclient.search(article_progress_monthly.query(req.opts)));
        last_30_days.article_progress = await article_progress_30days.transform(await esclient.search(article_progress_30days.query(req.opts)));
        last_30_days.article_time_spent = await article_time_spent.transform(await esclient.search(article_time_spent.query(req.opts)));
        last_30_days.article_hits = await article_hits.transform(await esclient.search(article_hits.query(req.opts)));
        res.send({ monthly, last_30_days });
    } catch (err) {
        console.error(err);
        res.send(500, { error: err });
    }
});

server.get("/readers/:limit/:page", async (req, res) => {
    try {
        const readers = (await req.apihelper.get("reader", { "filter[wordpress_id]": "$exists:1", "fields": "wordpress_id,email", "limit": req.params.limit, "page": req.params.page })).data;
        const results = [];
        for (let reader of readers) {
            let last_30_days = {};
            const article_progress = require("./elasticsearch/article_progress_30days");
            const article_time_spent = require("./elasticsearch/article_time_spent");
            const article_hits = require("./elasticsearch/article_hits");
            last_30_days.article_progress = await article_progress.transform(await esclient.search(article_progress.query({ reader 
            })));
            last_30_days.article_time_spent = await article_time_spent.transform(await esclient.search(article_time_spent.query({ reader 
            })));
            last_30_days.article_hits = await article_hits.transform(await esclient.search(article_hits.query({ reader 
            })));
            reader.last_30_days = last_30_days;
            results.push(reader);
        }
        res.send(results);
    } catch (err) {
        console.error(err);
        res.send(500, { error: err });
    }
})

server.listen(config.port || 3212, function () {
    console.log('%s listening at %s', server.name, server.url);
});