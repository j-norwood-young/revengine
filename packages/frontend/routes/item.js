const express = require('express');
const router = express.Router();
const config = require("config");
const isEmpty = require("../libs/utils").isEmpty;

const JXPHelper = require("jxp-helper");
const apihelper = new JXPHelper({ server: config.api.server });
const Collections = require("../libs/collections");
const collections = new Collections();

const getCollection = (req, res, next) => {
    try {
        const collection = collections.datadefs[req.params.type];
        if (!collection) throw ("Not found");
        res.locals.collection = collection;
        next();
    } catch (err) {
        console.error(err);
        res.status(500).render("error", err);
    }
}

router.use("/add/:type", getCollection, async (req, res) => {
    try {
        if (req.body.__save) {
            const result = await req.apihelper.post(req.params.type, req.body);
            res.redirect(`/item/edit/${req.params.type}/${ result.data._id }`)
        }
        res.render("item/add", { title: res.locals.collection.name, data: {} });
    } catch (err) {
        console.error(err);
        res.status(500).render("error", err);
    }
});

router.use("/edit/:type/:id", getCollection, async (req, res) => {
    try {
        if (req.body.__save) {
            await req.apihelper.put(req.params.type, req.params.id, req.body);
        }
        const data = await req.apihelper.getOne(req.params.type, req.params.id);
        res.render("item/edit", { title: data.name || res.locals.collection.name, data, type: req.params.type });
    } catch (err) {
        console.error(err);
        res.status(500).render("error", err);
    }
});

router.get("/delete/:type/:id", async(req, res) => {
    try {
        await req.apihelper.del(req.params.type, req.params.id);
        res.redirect(`/list/${req.params.type}`);
    } catch (err) {
        console.error(err);
        res.status(500).render("error", err);
    }
})

module.exports = router;