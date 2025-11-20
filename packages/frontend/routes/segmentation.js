import express from 'express';
const router = express.Router();
import config from "config";
import moment from "moment";

router.use("/", (req, res, next) => {
    res.locals.pg = "label";
    next();
})

router.get("/add", async (req, res) => {
    const labels = (await req.apihelper.get("label", { "sort[name]": 1 })).data;
    const segmentation = {
        labels_and_id: [],
        labels_not_id: []
    }
    res.render("segmentation/edit", { title: "Add Segmentation", labels, pg: "label", segmentation });
})

router.post("/add", async (req, res) => {
    try {
        const result = await req.apihelper.post("segmentation", { name: req.body.name, code: req.body.code, labels_and_id: req.body.labels_and, labels_not_id: req.body.labels_not });
        const labels = (await req.apihelper.get("label", { "sort[name]": 1 })).data;
        const segmentation = result.data;
        res.render("segmentation/edit", { title: "Edit Segmentation", labels, segmentation, pg: "label" });
    } catch(err) {
        res.status(500).render("error", {error: err});
    }
})

router.get("/edit/:segmentation_id", async (req, res) => {
    try {
        const labels = (await req.apihelper.get("label", { "sort[name]": 1 })).data;
        const segmentation = (await req.apihelper.getOne("segmentation", req.params.segmentation_id)).data;
        res.render("segmentation/edit", { title: "Edit Segmentation", labels, segmentation, pg: "label" });
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

export default router;