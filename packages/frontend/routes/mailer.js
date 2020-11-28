const express = require('express');
const router = express.Router();
const config = require("config");

const mailer = require("@revengine/mailer");

const JXPHelper = require("jxp-helper");
const apihelper = new JXPHelper({ server: config.api.server });

router.get("/reports", async (req, res) => {
    res.send({
        reports: mailer.mailer_names
    })
})

module.exports = router;