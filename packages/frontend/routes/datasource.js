const express = require('express');
const router = express.Router();
const config = require("config");
const crypto = require('crypto')

router.get("/view/:datasource_id", async (req, res) => {
    try {
        const datasource = await req.apihelper.getOne("datasource", req.params.datasource_id, { "sort[name]": 1 })
        res.render("datasource/datasource", { title: `Datasource: ${datasource}`, datasource });
    } catch (err) {
        console.error(err);
        res.render("error", err);
    }
})

router.get("/list", async (req, res) => {
    try {
        const datasources = await req.apihelper.get("datasources", { "sort[name]": 1 })
        res.render("datasource/list", { title: `Datasources`, datasource });
    } catch (err) {
        console.error(err);
        res.render("error", err);
    }
})

module.exports = router;