const express = require('express');
const router = express.Router();

const logged_in_only = (req, res, next) => {
    if (!req.session.apikey) {
        res.redirect("/");
        return;
    }
    next();
}

router.get("/settings", logged_in_only, async (req, res) => {
    try {
        const current_user = req.session.user.data;
        let message = null;
        if (req.query.updated) {
            message = { message: { type: "info", msg: "Account updated" }}
        }
        res.render("account/settings", { title: `My Account`, apikey: req.session.apikey, current_user, message });
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
        await req.apihelper.put("user", req.session.user.data._id, req.body);
        res.redirect("/account/settings?updated=1");
    } catch (err) {
        console.error(err);
        res.render("error", err);
    }
})

module.exports = router;