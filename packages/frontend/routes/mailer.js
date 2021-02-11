const express = require('express');
const router = express.Router();
const config = require("config");
const test_monthly_uber_mail = require("@revengine/mailer/touchbase").test_monthly_uber_mail;

const mailer = require("@revengine/mailer");

const JXPHelper = require("jxp-helper");
const apihelper = new JXPHelper({ server: config.api.server });

router.get("/reports", async (req, res) => {
    res.send({
        reports: mailer.mailer_names
    })
})

router.get("/individual", async (req, res) => {
    try {
        const transactional_names = Object.getOwnPropertyNames(Object.assign({}, config.touchbase.transactional_ids));
        res.render("mail/individual", { transactional_names, title: "Send Individual Mail"});
    } catch(err) {
        console.error(err);
        res.render(500, "error", {error: err});
    }
})

router.post("/individual", async (req, res) => {
    try {
        console.log(req.body);
        let to = req.body.to || req.body.reader_email;
        const result = await test_monthly_uber_mail(req.body.reader_email, to, req.body.transactional_id);
        const transactional_names = Object.getOwnPropertyNames(Object.assign({}, config.touchbase.transactional_ids));
        res.render("mail/individual", { transactional_names, title: "Send Individual Mail", message: { type: "info", msg: "Email sent" }});
    } catch(err) {
        console.error(err);
        res.render(500, "error", {error: err});
    }
})

module.exports = router;