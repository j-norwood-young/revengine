const restify = require("restify");
const config = require("config");
const Reports = require("@revengine/reports");
const JXPHelper = require("jxp-helper");
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const apicache = require('apicache');
const fetch = require("node-fetch");

const server = restify.createServer();

server.use(restify.plugins.queryParser());
server.use(apicache.middleware("5 minutes"));

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
                    date_modified: 1
                }
            }
        ])).data;
        for (let article of articles) {
            article.hits_last_hour = top_articles.find(hit => hit.key === article.post_id).doc_count;
        }
        articles.sort((a, b) => b.hits_last_hour - a.hits_last_hour);
        res.send(articles);
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

server.listen(config.wordpress.port, () => {
    console.log('%s listening at %s', server.name, server.url);
});