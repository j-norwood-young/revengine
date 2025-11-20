import express from 'express';
const router = express.Router();
import config from "config";
import { isEmpty } from "../libs/utils.js";
import Collections from "../libs/collections.js";
const collections = new Collections();

const loadForeignCollection = async (datadef, apihelper) => {
    try {
        for (let field of datadef.fields) {
            if (field.foreign_collection) {
                field.options = (await apihelper.get(field.foreign_collection, { fields: "_id,name", "sort[name]": 1 })).data;
                // console.log(field.options);
            }
        }
        return datadef;
    } catch(err) {
        console.error(err);
    }
}

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
        res.render("item/add", { title: res.locals.collection.name, data: {}, pg: req.params.type });
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
        const data = (await req.apihelper.getOne(req.params.type, req.params.id)).data;
        res.locals.collection = await loadForeignCollection(res.locals.collection, req.apihelper);
        // console.log(res.locals.collection);
        res.render("item/edit", { title: data.name || res.locals.collection.name, data, type: req.params.type, pg: req.params.type });
    } catch (err) {
        console.error(err);
        res.status(500).render("error", err);
    }
});

router.get("/delete/:type/:id", async(req, res) => {
    try {
        await req.apihelper.del_cascade(req.params.type, req.params.id);
        res.redirect(`/list/${req.params.type}`);
    } catch (err) {
        console.error(err);
        res.status(500).render("error", err);
    }
})

export default router;