const express = require('express');
const router = express.Router();
const config = require("config");
const jwt = require("jsonwebtoken")
const Mail = require("../libs/mail")

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
        const JXPHelper = require("jxp-helper");
        const apihelper = new JXPHelper({ server: config.api.server });
        const result = await apihelper.getjwt(req.body.email);
        const mail = new Mail();
        const content = `Someone (hopefully you) forgot your password for ${config.sitename}. You can log in <a href="${config.url}login/token/${result.token}">HERE</a>.`
        let mailresult = await mail.send({ to: result.email, content, subject: `${config.sitename} forgotten password` })
        console.log(result);
        res.send("Check your email");
    } catch (err) {
        console.error(err)
        res.send("Error")
    }
})

router.get("/token/:token", async (req, res) => {
    const JXPHelper = require("jxp-helper");
    try {
        let data = jwt.decode(req.params.token, config.shared_secret);
        if (!data.apikey) throw ("Invalid token");
        const tmp_apihelper = new JXPHelper(Object.assign(config.jxp, { apikey: data.apikey }));
        const user = await tmp_apihelper.getOne("user", data.id);
        req.session.user = user;
        req.session.apikey = data.apikey;
        res.redirect("/account/settings");
    } catch (err) {
        console.error(err);
        res.render("error");
    }
})

module.exports = router;