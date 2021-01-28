const express = require('express');
const router = express.Router();
const Reports = require("@revengine/reports");
const jsonexport = require("jsonexport");
const moment = require("moment");

router.get("/newsletter_subscribers", (req, res) => {
    res.render("reports/newsletter_subscribers");
})

router.post("/top_newsletter_subscribers", async (req, res) => {
    try {
        const days = Number(req.body.days) || 30;
        const min = Number(req.body.min) || 10;
        const event = req.body.event || "touchbaseevent-clicks";
        const with_subscriptions = req.body.with_subscriptions === "on" || false;
        console.log({ days, min, event, with_subscriptions });
        let results = null;
        if (with_subscriptions) {
            results = await Reports.NewsletterSubscribers.TopNewsletterSubscribersWithSubscriptions(days, min, event);
        } else {
            results = await Reports.NewsletterSubscribers.TopNewsletterSubscribers(days, min, event);
        }
        console.log(JSON.stringify(results.data.slice(0,10), null, "\t"));
        const csv = await jsonexport(results.data);
        res.attachment(`revengine_report-top_newsletter_subscribers-days_${days}-min_${min}-event_${event}${ with_subscriptions ? '-with_subscriptions' : '' }-${moment().format("YYYYMMDDHHmmss")}.csv`);
        res.send(csv);
    } catch(err) {
        console.error(err);
        res.status(500).send(err);
    }
})

module.exports = router;