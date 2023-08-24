const express = require('express');
const router = express.Router();

router.get("/settings", async (req, res) => {
    try {
        // const user = req.session.user;
        res.render("config/settings", { title: `System Config`, apikey: req.session.apikey });
    } catch (err) {
        console.error(err);
        res.render("error", err);
    }
})

router.post("/settings", async (req, res) => {
    try {
        // for (req.body as params) 
        // console.log(req.body);
        // await req.apihelper.put("config", req.session.user._id, req.body);
        res.redirect("/config/settings");
    } catch (err) {
        console.error(err);
        res.render("error", err);
    }
})

module.exports = router;