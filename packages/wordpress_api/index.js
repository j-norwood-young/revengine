const restify = require("restify");
const Cors = require("restify-cors-middleware");
const config = require("config");
const Reports = require("@revengine/reports");
const JXPHelper = require("jxp-helper");
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const apicache = require('apicache');
const fetch = require("node-fetch");

const server = restify.createServer();

server.use(restify.plugins.queryParser());
server.use(apicache.middleware("5 minutes"));
const cors = Cors({
    origins: config.cors_origins || ["*"],
});
server.pre(cors.preflight);
server.use(cors.actual);

/**
 * {post} /top_articles/:period?params
 * 
 * @param (String) "hour", "day", "week", "month"
 * 
 * POST params:
 * - size: (Int) number of posts to return, default: 5
 * - published_date_gte: (Date) return posts published on or after this date
 * - unfiltered_fallback: (Boolean) return unfiltered posts if less than ${size} results are found
 * - article_id: (Int) return a single post by id
 * - author: (String) return posts by author
 * - content_type: (String) return posts by content type
 * - tag: (String) return posts by tag
 * - section: (String) return posts by section
 * - exclude_section: (String) return posts by section, excluding the given section
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
            "Devil’s Peak",
            "Fire",
            "NCC Wildfires",
            "Philip Kgosana Drive",
            "Rhodes Memorial",
            "South African National Parks",
            "Table Mountain"
        ],
        "title": "‘Out-of-control’ Table Mountain fire forces UCT evacuation",
        "urlid": "pyrocene-cape-out-of-control-wildfire-rages-on-slopes-of-table-mountain",
        "img_full": "https://www.dailymaverick.co.za/wp-content/uploads/fire-pic.jpeg",
        "img_medium": "https://www.dailymaverick.co.za/wp-content/uploads/fire-pic-480x360.jpeg",
        "img_thumbnail": "https://www.dailymaverick.co.za/wp-content/uploads/fire-pic-150x150.jpeg",
        "custom_section_label": "Pyrocene Cape II",
        "hits": 4
    },
    ...
    ]
 **/
server.get("/top_articles/:period", async (req, res) => {
    try {
        const report = new Reports.TopLastPeriod();
        const size = req.query.size || req.params.size || 5;
        const params = Object.assign({ size }, req.params, req.query);
        // console.log(params);
        const top_articles = await report.run(params);
        let articles = (await jxphelper.aggregate("article", [
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
        ])).data;
        for (let article of articles) {
            article.hits = top_articles.find(hit => hit.key === article.post_id).doc_count;
        }
        articles.sort((a, b) => b.hits - a.hits);
        let filtered_articles = articles;
        if (params.published_date_gte) {
            filtered_articles = articles.filter(a => +new Date(a.date_published) >= +new Date(params.published_date_gte));
        }
        if (params.unfiltered_fallback && filtered_articles.length < size) {
            filtered_articles = articles;
        }
        res.send(filtered_articles.slice(0, size));
    } catch(err) {
        console.error(err);
        res.send(500, { status: "error", error: err });
    }
})

server.get("/top_articles", async (req, res) => {
    try {
        const report = new Reports.TopLastHour();
        const size = +req.query.size || 5;
        const top_articles = await report.run({ size });
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
                    date_modified: 1,
                    img_thumbnail: 1,
                    img_medium: 1,
                    img_full: 1
                }
            }
        ])).data;
        for (let article of articles) {
            article.hits_last_hour = top_articles.find(hit => hit.key === article.post_id).doc_count;
        }
        articles.sort((a, b) => b.hits_last_hour - a.hits_last_hour);
        res.send(articles.slice(0, size));
    } catch(err) {
        console.error(err);
        res.send(500, { status: "error", error: err });
    }
})

server.get("/front_page", async (req, res) => {
    try {
        const result = await fetch(`${config.wordpress.server}/wp-json/revengine/v1/featured`, {
            method: 'get',
            headers: {
                'Authorization': `Bearer ${process.env.WORDPRESS_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        const json_result = await result.json();
        const articles = json_result.data;
        const report = new Reports.TopLastHour();
        for (let article of articles) {
            const hits = await report.run({ article_id: article.post_id });
            article.hits = hits[0] ? hits[0].doc_count : 0;
        }
        res.send(articles);
    } catch (err) {
        console.error(err);
        res.send(500, { status: "error", error: err });
    }
})

server.get("/top_articles_by_section/:section", async (req, res) => {
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
            article.hits_last_hour = top_articles.find(hit => hit.key === article.post_id).doc_count;
        }
        articles.sort((a, b) => b.hits_last_hour - a.hits_last_hour);
        res.send(articles);
    } catch (err) {
        console.error(err);
        res.send(500, { status: "error", error: err });
    }
})

server.get("/reader/:wordpress_id", async (req, res) => {
    try {
        const wordpress_id = req.params.wordpress_id;
        const reader = (await jxphelper.get("reader", { "filter[wordpress_id]": wordpress_id, "populate[segment]": "code", "fields": "segmentation_id" })).data.pop();
        if (!reader) {
            return res.send(404, { status: "error", message: "Reader not found"});
        }
        res.send({ status: "ok", data: { segments: reader.segment.map(segment => segment.code), labels: reader.lbl, authors: reader.authors, sections: reader.sections }});
    } catch(err) {
        console.error(err);
        res.send({ status: "error" });
    }
})

server.listen(config.wordpress.port, () => {
    console.log('%s listening at %s', server.name, server.url);
});