const express = require('express');
const router = express.Router();
const config = require("config");
const jwt = require("jsonwebtoken")
const Mail = require("../libs/mail")

const logged_in_only = (req, res, next) => {
    if (!req.session.apikey) {
        res.redirect("/");
        return;
    }
    next();
}

router.get("/settings", logged_in_only, async (req, res) => {
    try {
        // const user = req.session.user;
        res.render("account/settings", { title: `My Account`, apikey: req.session.apikey });
    } catch(err) {
        console.error(err);
        res.render("error", err);
    }
})

router.post("/settings", logged_in_only, async (req, res) => {
    try {
        if (req.body.password && req.body.password !== req.body.confirm_password) {
            throw ("Passwords don't match");
        }
        await req.apihelper.put("user", req.session.user._id, req.body);
        res.redirect("/account/settings");
    } catch (err) {
        console.error(err);
        res.render("error", err);
    }
})

module.exports = router;