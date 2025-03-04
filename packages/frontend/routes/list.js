const express = require('express');
const router = express.Router();
const config = require("config");

const JXPHelper = require("jxp-helper");
const apihelper = new JXPHelper({ server: process.env.API_SERVER || config.api.server });
const Collections = require("../libs/collections");
const collections = new Collections;

const populate = ((req, res, next) => {
    const type = req.params.type;
    const typedef = res.locals.typedefs[type];
    res.locals.page = req.params.page || typedef.state.page || 1;
    res.locals.limit = req.params.limit || typedef.state.limit || 100;
    res.locals.fields = typedef.fields.join(",");
    res.locals.type = type;
    res.locals.typedef = typedef;
    next();
});

router.get("/json/raw/:type", async (req, res) => {
    try {
        const q = Object.assign({
            limit: 1000
        }, res.locals.query)
        const data = (await req.apihelper.get(req.params.type, q));
        res.send(data);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "An error occured", state: "error", error: err });
    }
})

router.get("/json/:type", populate, async (req, res) => {
    try {
        const data = (await apihelper.get(res.locals.type, { fields: res.locals.fields, page: res.locals.page, limit: res.locals.limit, "sort[createdAt]": -1 }));
        res.send(data);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "An error occured", state: "error", error: err });
    }
});

router.post("/paginate/:type", async (req, res) => {
    try {
        const type = req.params.type;
        const limit = req.body.limit || 100;
        const page = req.body.page || 0;
        const sortby = req.body.sortby || "name";
        const sortdir = req.body.sortdir || 1;
        const filters = (req.body.filters) ? JSON.parse(req.body.filters) : {};
        const populate = (req.body.populate) ? JSON.parse(req.body.populate) : null;
        const data = {
            page,
            limit
        };
        data[`sort[${sortby}]`] = sortdir;
        if (populate) {
            for (let i in populate) {
                data[`populate[${i}]`] = populate[i];
            }
        }
        for (let i in populate) {
            data[`populate[${i}]`] = populate[i];
        }
        let andfilters = [];
        for (let i in filters) {
            let d = {}
            d[i] = filters[i];
            andfilters.push(d);
        }
        let orsearches = [];
        if (req.body.search) {
            let search_fields = req.body["search_fields"];
            if (!Array.isArray(search_fields)) search_fields = [search_fields];
            for (let search_field of search_fields) {
                let d = {};
                d[search_field] = { "$regex": req.body.search, "$options": "i" }
                orsearches.push(d);
            }
        }
        let query = {};
        if (andfilters.length || orsearches.length) {
            let combined = [];
            if (andfilters.length) combined.push({ "$and": andfilters });
            if (orsearches.length) combined.push({ "$or": orsearches });
            query = { "$and": combined };
        }
        const result = await req.apihelper.query(type, query, data);
        res.send(result);
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});

router.get("/:type", (req, res) => {
    try {
        const collection = collections.datadefs[req.params.type];
        res.render("list", { title: collection.name, type: req.params.type, pg: req.params.type });
    } catch (err) {
        console.error(err);
        res.render("error", err);
    }
});

module.exports = router;