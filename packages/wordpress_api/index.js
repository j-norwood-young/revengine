const restify = require("restify");
const Cors = require("restify-cors-middleware");
const config = require("config");
const Reports = require("@revengine/reports");
const JXPHelper = require("jxp-helper");
const jxphelper = new JXPHelper({ server: process.env.API_SERVER || config.api.server, apikey: process.env.APIKEY });
const apicache = require('apicache');
const fetch = require("node-fetch");
const dotenv = require("dotenv");
dotenv.config();

// Enhanced logging setup
const bunyan = require('bunyan');
const log = bunyan.createLogger({
    name: 'wordpress-api',
    streams: [{
        level: 'info',
        stream: process.stdout
    }]
});

// Process monitoring
process.on('SIGTERM', () => {
    log.error('Received SIGTERM signal - process is being terminated');
    logMemoryUsage();
    process.exit(1);
});

process.on('SIGINT', () => {
    log.error('Received SIGINT signal - process is being interrupted');
    logMemoryUsage();
    process.exit(1);
});

process.on('exit', (code) => {
    log.error(`Process exit with code: ${code}`);
    logMemoryUsage();
});

// Enhanced error tracking
let lastError = null;
let errorCount = 0;
const trackError = (err, context = '') => {
    errorCount++;
    lastError = {
        timestamp: new Date(),
        error: err,
        context,
        memory: process.memoryUsage(),
        stack: err.stack
    };
    log.error({
        count: errorCount,
        context,
        error: err.message,
        stack: err.stack,
        memory: {
            rss: `${Math.round(lastError.memory.rss / 1024 / 1024 * 100) / 100} MB`,
            heapTotal: `${Math.round(lastError.memory.heapTotal / 1024 / 1024 * 100) / 100} MB`,
            heapUsed: `${Math.round(lastError.memory.heapUsed / 1024 / 1024 * 100) / 100} MB`
        }
    });
};

// Memory usage logging
const logMemoryUsage = () => {
    const used = process.memoryUsage();
    const metrics = {
        rss: `${Math.round(used.rss / 1024 / 1024 * 100) / 100} MB`,
        heapTotal: `${Math.round(used.heapTotal / 1024 / 1024 * 100) / 100} MB`,
        heapUsed: `${Math.round(used.heapUsed / 1024 / 1024 * 100) / 100} MB`,
        heapUsedPercentage: `${Math.round(used.heapUsed / used.heapTotal * 100)}%`,
        external: `${Math.round(used.external / 1024 / 1024 * 100) / 100} MB`,
    };
    log.info('Memory usage:', metrics);
};

// Enhanced uncaught exception handler
process.on('uncaughtException', (err) => {
    trackError(err, 'Uncaught Exception');
    log.error('Uncaught Exception:', err);
    log.error('Stack trace:', err.stack);
    logMemoryUsage();
});

// Enhanced unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    trackError(reason, 'Unhandled Rejection');
    log.error('Unhandled Rejection at:', promise);
    log.error('Reason:', reason);
    logMemoryUsage();
});

// Log memory usage every minute
setInterval(logMemoryUsage, 60000);
// Initial memory usage log
logMemoryUsage();

const server = restify.createServer({
    handleUpgrades: true,
    log: log
});

// Enhanced error event handler
server.on('error', (err) => {
    trackError(err, 'Server Error');
    log.error('Server error:', err);
    logMemoryUsage();
});

// Enhanced uncaughtException handler
server.on('uncaughtException', (req, res, route, err) => {
    trackError(err, `Uncaught Exception in route: ${route.spec.path}`);
    log.error('Uncaught exception:', err);
    log.error('Route:', route);
    log.error('Request:', {
        url: req.url,
        method: req.method,
        headers: req.headers,
        params: req.params,
        query: req.query,
        body: req.body
    });
    logMemoryUsage();
    if (!res.headersSent) {
        res.send(500, { status: "error", message: "Internal server error" });
    }
});

// Add request logging middleware
server.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        log.info({
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.headers['user-agent'],
            ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
        });
    });
    next();
});

server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());
const cors = Cors({
    origins: config.cors_origins || ["*"],
});
server.pre(cors.preflight);
server.use(cors.actual);

/**
 * @api {post} /random
 * 
 * Returns a semi-random article
 * 
 * @param {integer} size - The number of articles to return
 * @param {date} published_start_date - article must be published after this date
 * @param {date} published_end_date - article must be published before this date
 * @param {array of strings} ignore_post_ids - article must not be in this list
 * @param {integer} jitter_factor - multiply results by this factor before picking random article, default: 10
 * 
 **/
server.post("/random", async (req, res) => {
    try {
        const size = req.body.size || 1;
        const ignore_post_ids = req.body.ignore_post_ids || [];
        const published_start_date = req.body.published_start_date || null;
        const published_end_date = req.body.published_end_date || null;
        const jitter_factor = req.body.jitter_factor || 10;
        const report = new Reports.Random({ size, published_start_date, published_end_date, ignore_post_ids, jitter_factor });
        const result = await report.random_articles();
        res.send({ size, ignore_post_ids, published_start_date, published_end_date, jitter_factor, result });
    } catch (err) {
        console.error(err);
        res.send(500, { status: "error" });
    }
})

const top_articles_report = async (params) => {
    try {
        const report = new Reports.TopLastPeriod();
        const default_params = {
            size: 5,
            start_period: "now-1h/h",
            end_period: "now/h",
        }
        params = Object.assign(default_params, params);
        const top_articles = await report.run(params);
        const pipeline = [
            {
                $match: {
                    post_id: { $in: top_articles.map(a => a.key) }
                }
            },
            {
                $project: {
                    post_id: 1,
                    title: 1,
                    urlid: 1,
                    author: 1,
                    exceprt: 1,
                    sections: 1,
                    tags: 1,
                    custom_section_label: 1,
                    date_published: 1,
                    date_modified: 1,
                    img_thumbnail: 1,
                    img_medium: 1,
                    img_full: 1
                }
            }
        ];
        let articles = (await jxphelper.aggregate("article", pipeline)).data;
        // console.log(JSON.stringify(pipeline));
        for (let article of articles) {
            article.hits = top_articles.find(hit => hit.key === article.post_id).doc_count;
            article.url = `https://www.dailymaverick.co.za/article/${article.date_published.substring(0, 10)}-${article.urlid}`;
        }
        articles.sort((a, b) => b.hits - a.hits);
        return articles.slice(0, params.size);
    } catch (err) {
        throw err;
    }
}

/**
 * {get} /top_articles/:period?params
 * 
 * @param (String) "hour", "day", "week", "month"
 * 
 * Query params:
 * - size: (Int) number of posts to return, default: 5
 * - published_date_gte: (Date) return posts published on or after this date
 * - start_period: (ES Period) filter hits on or after this date (NOTE: this will override the period parameter, but you could just use /top_articles endpoint for clarity)
 * - end_period: (ES Period) filter hits on or before this date
 * - signed_in: (Boolean) filter hits by signed in users
 * - article_id: (Int) return a single post by id
 * - author: (String) return posts by author
 * - content_type: (String) return posts by content type
 * - tag: (String) return posts by tag
 * - section: (String) return posts by section
 * - exclude_section: (String) exclude posts by section, comma-separate for multiple
 * - exclude_tag: (String) exclude posts by tag, comma-separate for multiple
 * - exclude_author: (String) exclude posts by author, comma-separate for multiple
 * - exclude_content_type: (String) exclude posts by content type, comma-separate for multiple
 * 
 * returns:
 * (Array) array of posts
 * {
        "_id": (ObjectId) article._id,
        "post_id": (Int) article.post_id,
        "author": (String) article.author,
        "date_modified": (String) article.date_modified,
        "date_published": (String) article.date_published,
        "sections": (Array) (String) article.sections,
        "tags": (Array) (String) article.tags,
        "title": (String) article.title,
        "urlid": (String) article.urlid,
        "img_full": (String) article.img_full,
        "img_medium": (String) article.img_medium,
        "img_thumbnail": (String) article.img_thumbnail,
        "custom_section_label": (String) article.custom_section_label,
        "hits": (Int) article.hits,
    },
 *
 * Example:
 * /top_articles/day?size=5&section=South+Africa&tag=Table+Mountain&published_date_gte=2021-04-01&unfiltered_fallback=1
 * Returns: 
 * [
    {
        "_id": "607c13a11c234ab10e9ca296",
        "post_id": 895227,
        "author": "Tiara Walters",
        "date_modified": "2021-04-18T18:26:39.000Z",
        "date_published": "2021-04-18T11:09:48.000Z",
        "sections": [
            "Our Burning Planet",
            "South Africa"
        ],
        "tags": [
            "Devil's Peak",
            "Fire",
            "NCC Wildfires",
            "Philip Kgosana Drive",
            "Rhodes Memorial",
            "South African National Parks",
            "Table Mountain"
        ],
        "title": "'Out-of-control' Table Mountain fire forces UCT evacuation",
        "urlid": "pyrocene-cape-out-of-control-wildfire-rages-on-slopes-of-table-mountain",
        "img_full": "https://www.dailymaverick.co.za/wp-content/uploads/fire-pic.jpeg",
        "img_medium": "https://www.dailymaverick.co.za/wp-content/uploads/fire-pic-480x360.jpeg",
        "img_thumbnail": "https://www.dailymaverick.co.za/wp-content/uploads/fire-pic-150x150.jpeg",
        "custom_section_label": "Pyrocene Cape II",
        "hits": 4,
        "url": "https://www.dailymaverick.co.za/article/2021-04-18-out-of-control-table-mountain-fire-forces-uct-evacuation/"
    },
    ...
    ]
 **/
server.get("/top_articles/:period", apicache.middleware("5 minutes"), async (req, res) => {
    try {
        const periods = {
            hour: "now-1h/h",
            day: "now-1d/d",
            week: "now-7d/d",
            month: "now-30d/d",
            // sixmonth: "now-6M/M",
            // year: "now-1y/y",
        }
        const period = req.params.period;
        if (!periods[period]) throw `Unknown period. Choose from ${Object.keys(periods).join(", ")}`;
        const size = req.query.size || 5;
        const start_period = periods[period];
        const end_period = "now/h";
        const params = Object.assign({ size, start_period, end_period }, req.query);
        if (config.debug) {
            console.log({ params });
        }
        const articles = await top_articles_report(params);
        res.send(articles);
    } catch (err) {
        console.error(err);
        res.send(500, { status: "error" });
    }
})

/**
 * {get} /top_articles
 * 
 * A shortcut for /top_articles with default size=5 and period=hour
 * 
 */
server.get("/top_articles", apicache.middleware("5 minutes"), async (req, res) => {
    try {
        const params = Object.assign({
            size: req.query.size || 5,
            start_period: "now-1h/h",
        }, req.query);
        const articles = await top_articles_report(params);
        res.send(articles);
    } catch (err) {
        console.error(err);
        res.send(500, { status: "error" });
    }
})

server.get("/front_page", apicache.middleware("5 minutes"), async (req, res) => {
    try {
        if (!process.env.REVENGINE_WORDPRESS_KEY) {
            throw new Error("REVENGINE_WORDPRESS_KEY is not set");
        }
        const result = await fetch(`${config.wordpress.server}/wp-json/revengine/v1/featured`, {
            method: 'get',
            headers: {
                'Authorization': `Bearer ${process.env.REVENGINE_WORDPRESS_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        const json_result = await result.json();
        if (json_result.code === "rest_forbidden") {
            throw new Error("Wordpress REST API error - rest_forbidden");
        }
        const articles = json_result.data;
        const report = new Reports.TopLastHour();
        for (let article of articles) {
            const hits = await report.run({ article_id: article.post_id });
            article.hits = hits[0] ? hits[0].doc_count : 0;
        }
        res.send(articles);
    } catch (err) {
        console.error('Error in /front_page:', err);
        console.error('Stack trace:', err.stack);
        if (!res.headersSent) {
            res.send(500, { status: "error", message: err.message || "Internal server error" });
        }
    }
});

server.get("/top_articles_by_section/:section", apicache.middleware("5 minutes"), async (req, res) => {
    try {
        const report = new Reports.TopLastHour();
        const size = req.query.size || 5;
        const top_articles = await report.run({ size, section: req.params.section });
        const articles = (await jxphelper.aggregate("article", [
            {
                $match: {
                    post_id: { $in: top_articles.map(a => a.key) }
                }
            },
            {
                $project: {
                    post_id: 1,
                    title: 1,
                    urlid: 1,
                    author: 1,
                    exceprt: 1,
                    sections: 1,
                    tags: 1,
                    date_published: 1,
                    date_modified: 1
                }
            }
        ])).data;

        for (let article of articles) {
            const hit = top_articles.find(hit => hit.key === article.post_id);
            article.hits_last_hour = hit ? hit.doc_count : 0;
        }
        articles.sort((a, b) => b.hits_last_hour - a.hits_last_hour);
        res.send(articles);
    } catch (err) {
        console.error('Error in /top_articles_by_section:', err);
        console.error('Request params:', req.params);
        console.error('Stack trace:', err.stack);
        if (!res.headersSent) {
            res.send(500, { status: "error", message: err.message || "Internal server error" });
        }
    }
});

server.get("/reader/:wordpress_id", apicache.middleware("5 minutes"), async (req, res) => {
    try {
        // Return a 503 for now
        res.send(503, { status: "error", message: "Reader endpoint is currently disabled" });
        return;
        const wordpress_id = req.params.wordpress_id;
        // console.log(`Fetching reader for wordpress_id: ${wordpress_id}`);

        const reader = (await jxphelper.get("reader", {
            "filter[wordpress_id]": wordpress_id,
            "populate[segment]": "code",
            "fields": "segmentation_id"
        })).data.pop();

        if (!reader) {
            console.log(`Reader not found for wordpress_id: ${wordpress_id}`);
            res.send(404, { status: "error", message: "Reader not found" });
            return;
        }

        const response = {
            status: "ok",
            data: {
                segments: reader.segment ? reader.segment.map(segment => segment.code) : [],
                labels: reader.lbl || [],
                authors: reader.authors || [],
                sections: reader.sections || []
            }
        };

        res.send(response);
    } catch (err) {
        console.error('Error in /reader endpoint:', err);
        console.error('Request params:', req.params);
        console.error('Stack trace:', err.stack);

        if (!res.headersSent) {
            res.send(500, { status: "error", message: err.message || "Internal server error" });
        }
    }
});

server.get("/analytics/posts", apicache.middleware("5 minutes"), async (req, res) => {
    try {
        let post_ids = req.query.post_ids;
        if (!post_ids) {
            res.send([]);
            return;
        }
        if (!Array.isArray(post_ids)) {
            post_ids = [post_ids];
        }
        if (post_ids.length === 0) {
            res.send([]);
            return;
        }

        console.log('Processing analytics for post_ids:', post_ids);

        const report = new Reports.TopLastHour();
        const post_hits = await report.run({ article_id: post_ids.map(id => Number(id)) });

        const response = post_hits.map(a => ({
            post_id: a.key,
            hits: a.doc_count,
            avg_scroll_depth: Math.round(a.avg_scroll_depth.value),
            avg_seconds_on_page: Math.round(a.avg_seconds_on_page.value)
        }));

        res.send(response);
    } catch (err) {
        console.error('Error in GET /analytics/posts:', err);
        console.error('Request query:', req.query);
        console.error('Stack trace:', err.stack);

        if (!res.headersSent) {
            res.send(500, { status: "error", message: err.message || "Internal server error" });
        }
    }
});

server.post("/analytics/posts", apicache.middleware("5 minutes"), async (req, res) => {
    try {
        let { post_ids } = req.body;
        // console.log('Processing POST analytics for post_ids:', post_ids);

        if (!Array.isArray(post_ids)) {
            if (typeof post_ids === "object") {
                post_ids = Object.values(post_ids);
            } else {
                post_ids = [post_ids];
            }
        }

        post_ids = post_ids.map(id => Number(id));
        const report = new Reports.TopLastHour();
        const top_articles = await report.run({ article_id: post_ids });

        const result = [];
        for (let post_id of post_ids) {
            const post = top_articles.find(a => a.key === Number(post_id));
            result.push({
                post_id,
                hits: post ? post.doc_count : 0,
                avg_scroll_depth: post ? Math.round(post.avg_scroll_depth.value) : 0,
                avg_seconds_on_page: post ? Math.round(post.avg_seconds_on_page.value) : 0
            });
        }

        res.send(result);
    } catch (err) {
        console.error('Error in POST /analytics/posts:', err);
        console.error('Request body:', req.body);
        console.error('Stack trace:', err.stack);

        if (!res.headersSent) {
            res.send(500, { status: "error", message: err.message || "Internal server error" });
        }
    }
});

server.post("/simulate/top_articles", apicache.middleware("5 minutes"), async (req, res) => {
    try {
        const { posts } = req.body;
        console.log('Simulating top articles for posts:', JSON.stringify(posts));

        if (!Array.isArray(posts)) {
            throw new Error('Posts must be an array');
        }

        const simulatedPosts = posts.map(post => ({
            ...post,
            hits_last_hour: Math.floor(Math.random() * 100)
        }));

        console.log('Simulated posts:', JSON.stringify(simulatedPosts));
        res.send(simulatedPosts);
    } catch (err) {
        console.error('Error in /simulate/top_articles:', err);
        console.error('Request body:', JSON.stringify(req.body));
        console.error('Stack trace:', err.stack);
        res.send(500, { status: "error", error: err.message });
    }
});

server.listen(process.env.PORT || config.wordpress.port, () => {
    console.log('%s listening at %s', server.name, server.url);
});