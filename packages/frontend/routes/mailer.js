const express = require('express');
const router = express.Router();
const config = require("config");
const test_monthly_uber_mail = require("@revengine/mailer/touchbase").test_monthly_uber_mail;

const mailer = require("@revengine/mailer");

const JXPHelper = require("jxp-helper");
const { run_transactional } = require('@revengine/mailer/touchbase');
const apihelper = new JXPHelper({ server: config.api.server });

router.get("/reports", async (req, res) => {
    res.send({
        reports: mailer.mailer_names
    })
})

router.get("/individual", async (req, res) => {
    try {
        const touchbasetransactionals = (await req.apihelper.get("touchbasetransactional", { "sort[name]": 1 })).data;
        console.log({touchbasetransactionals});
        res.render("mail/individual", { touchbasetransactionals, title: "Send Individual Mail"});
    } catch(err) {
        console.error(err);
        res.render(500, "error", {error: err});
    }
})

router.post("/individual", async (req, res) => {
    try {
        console.log(req.body);
        let to = req.body.to || req.body.reader_email;
        const result = await run_transactional(req.body.reader_email, to, req.body.touchbasetransactional);
        const touchbasetransactionals = (await req.apihelper.get("touchbasetransactional", { "sort[name]": 1 })).data;
        res.render("mail/individual", { touchbasetransactionals, title: "Send Individual Mail", message: { type: "info", msg: "Email sent" }});
    } catch(err) {
        console.error(err);
        res.send(err.toString());
    }
})

module.exports = router;