const express = require('express');
const router = express.Router();
const config = require("config");
const moment = require("moment");

router.get("/add", async (req, res) => {
    const labels = (await req.apihelper.get("label", { "sort[name]": 1 })).data;
    res.render("segmentation/edit", { title: "Add Segmentation", labels });
})

router.post("/add", async (req, res) => {
    try {
        const result = await req.apihelper.post("segmentation", { name: req.body.name, code: req.body.code, labels_and_id: req.body.labels_and, labels_not_id: req.body.labels_not });
        res.send(result);
    } catch(err) {
        res.send(err.toString())
    }
})

router.get("/edit/:segmentation_id", async (req, res) => {
    try {
        const labels = (await req.apihelper.get("label", { "sort[name]": 1 })).data;
        const segmentation = (await req.apihelper.getOne("segmentation", req.params.segmentation_id)).data;
        res.render("segmentation/edit", { title: "Edit Segmentation", labels, segmentation });
    } catch(err) {
        res.status(500).render("error", {error: err});
    }
})

router.post("/edit/:segmentation_id", async (req, res) => {
    try {
        const name = req.body.name;
        const code = req.body.code;
        if (!Array.isArray(req.body.labels_and)) req.body.labels_and = [req.body.labels_and];
        if (!Array.isArray(req.body.labels_not)) req.body.labels_not = [req.body.labels_not];
        const labels_and_id = req.body.labels_and ? req.body.labels_and.map(label => label) : [];
        const labels_not_id = req.body.labels_not ? req.body.labels_not.map(label => label) : [];
        await req.apihelper.put("segmentation", req.params.segmentation_id, { name, code, labels_and_id, labels_not_id });
        const labels = (await req.apihelper.get("label", { "sort[name]": 1 })).data;
        const segmentation = (await req.apihelper.getOne("segmentation", req.params.segmentation_id)).data;
        res.render("segmentation/edit", { title: "Edit Segmentation", labels, segmentation });
    } catch(err) {
        res.status(500).render("error", {error: err});
    }
})

module.exports = router;