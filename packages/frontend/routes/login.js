const express = require('express');
const router = express.Router();
const config = require("config");
const jwt = require("jsonwebtoken")
const Mail = require("../libs/mail")
const JXPHelper = require("jxp-helper");
const apihelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });

router.use((req, res, next) => {
    res.locals.sitename = config.frontend.sitename;
    next();
});

router.get("/logout", async (req, res) => {
    try {
        await axios.get(`${config.api_root}/login/logout?apikey=${req.session.apikey}`);
        req.session.destroy();
        res.redirect("/login");
    } catch (err) {
        console.error(err);
        req.session.destroy();
        res.redirect("/login");
    }
});

router.get("/forgot", (req, res) => {
    res.render("login/forgot");
})

router.post("/forgot", async (req, res) => {
    try {
        const result = await apihelper.getjwt(req.body.email);
        const mail = new Mail();
        const content = `Someone (hopefully you) forgot your password for ${config.frontend.sitename}. You can log in <a href="${config.frontend.url}login/token/${result.token}">HERE</a>.`
        let mailresult = await mail.send({ to: result.email, content, subject: `${config.frontend.sitename} forgotten password` })
        console.log(result);
        res.send("Check your email");
    } catch (err) {
        console.error(err)
        res.send("Error")
    }
})

router.get("/token/:token", async (req, res) => {
    try {
        let data = jwt.decode(req.params.token, config.api.shared_secret);
        if (!data.apikey) throw ("Invalid token");
        const user = await apihelper.getOne("user", data.id);
        req.session.user = user;
        req.session.apikey = data.apikey;
        res.redirect("/account/settings");
    } catch (err) {
        console.error(err);
        res.render("error");
    }
})

module.exports = router;