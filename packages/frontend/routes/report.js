const express = require('express');
const router = express.Router();
const Reports = require("@revengine/reports");
const jsonexport = require("jsonexport");
const moment = require("moment");

router.use("/", (req, res, next) => {
    res.locals.pg = "report";
    res.locals.title = "Reports";
    next();
})

router.get("/", (req, res) => {
    res.render("reports");
})

router.get("/newsletter_subscribers", (req, res) => {
    res.render("reports/newsletter_subscribers");
})

router.get("/facet/author", async (req, res) => {
    const author_query = [
        { $group: { _id: { author: '$author' } } },
        { $project: {
            author: 1
        }},
    ]
    const authors = (await req.apihelper.aggregate("article", author_query)).data.map(item => item._id.author);
    authors.sort();
    res.render("reports/author_facet", { title: "Facet readers by author", authors})
})

router.post("/facet/author", async (req, res) => {
    try {
        const author = req.body.author;
        const facets = new Reports.Facets();
        const results = await facets.author(author);
        const readers = [];
        for (let result of results) {
            const reader = (await req.apihelper.get("reader", { "filter[wordpress_id]": result.wordpress_id, "fields": "id,display_name,first_name,last_name,email"})).data[0];
            readers.push(Object.assign(result, reader));
        }
        res.render("reports/reader_facet_result", { title: `Author ${author}'s readers `, readers });
    } catch(err) {
        console.error(err);
        res.status(500).send(err);
    }
})

router.get("/typeahead/tag/:tag", async(req, res) => {
    const tag = req.params.tag;
    const tag_query = [
        { $unwind: "$tags" },
        { $match: {
            tags: {
                "$regex": `${tag}`,
                "$options": "i"
            }
        }},
        { $group: { _id: { tags: '$tags' }, count: { $sum: 1 } } },
        { $limit: 100 }
    ]
    const tags = (await req.apihelper.aggregate("article", tag_query)).data.map(item => item._id.tags);
    tags.sort();
    res.send(tags);
})

router.get("/facet/tag", async (req, res) => {
    res.render("reports/tag_facet", { title: "Facet readers by tag" })
})

router.post("/facet/tag", async (req, res) => {
    try {
        const tag = req.body.tag;
        const facets = new Reports.Facets();
        const results = await facets.tag(tag);
        const readers = [];
        for (let result of results) {
            const reader = (await req.apihelper.get("reader", { "filter[wordpress_id]": result.wordpress_id, "fields": "id,display_name,first_name,last_name,email"})).data[0];
            readers.push(Object.assign(result, reader));
        }
        res.render("reports/reader_facet_result", { title: `Tag ${tag}'s readers `, readers });
    } catch(err) {
        console.error(err);
        res.status(500).send(err);
    }
})

router.get("/mail_report/:report", async (req, res) => {
    const report = require(`@revengine/reports/reports/${ req.params.report }`);
    const content = await report.content();
    res.render("reports/mail_report", { content });
})

router.post("/top_newsletter_subscribers", async (req, res) => {
    try {
        const days = Number(req.body.days) || 30;
        const min = Number(req.body.min) || 10;
        const event = req.body.event || "clicks";
        const with_subscriptions = req.body.with_subscriptions === "on" || false;
        // console.log({ days, min, event, with_subscriptions });
        let results = null;
        if (with_subscriptions) {
            results = await Reports.NewsletterSubscribers.TopNewsletterSubscribersWithSubscriptions(days, min, event);
        } else {
            results = await Reports.NewsletterSubscribers.TopNewsletterSubscribers(days, min, event);
        }
        // console.log(JSON.stringify(results.data.slice(0,10), null, "\t"));
        const csv = await jsonexport(results.data);
        res.attachment(`revengine_report-top_newsletter_subscribers-days_${days}-min_${min}-event_${event}${ with_subscriptions ? '-with_subscriptions' : '' }-${moment().format("YYYYMMDDHHmmss")}.csv`);
        res.send(csv);
    } catch(err) {
        console.error(err);
        res.status(500).send(err);
    }
})

module.exports = router;