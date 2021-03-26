const express = require('express');
const router = express.Router();

router.use("/", (req, res, next) => {
    res.locals.pg = "settings";
    res.locals.title = "Settings";
    next();
})

router.get("/", (req, res, next) => {
    res.render("settings");
})

module.exports = router;