import express from 'express';
const router = express.Router();
import config from "config";
import moment from "moment";

router.use("/", (req, res, next) => {
    res.locals.pg="label";
    next();
})

router.get("/", (req, res) => {
    res.render("label");
})

// Deprecated in favour of /download
router.get("/download/json/:label_id", async (req, res) => {
    try {
        const readers = (await req.apihelper.get("reader", { "filter[label_id]": req.params.label_id, "fields": "email,first_name,last_name,createdAt,updatedAt,label_id" })).data;
        res.send(readers);
    } catch(err) {
        console.error(err);
        res.send(err);
    }
})

// Deprecated in favour of /download
router.get("/download/csv/:label_id", async (req, res) => {
    try {
        const label = (await req.apihelper.getOne("label", req.params.label_id)).data;
        const readers = await req.apihelper.csv("reader", { "filter[label_id]": req.params.label_id, "fields": "email,first_name,last_name,createdAt,updatedAt" });
        res.attachment(`${label.name.toLowerCase().replace(" ", "_")}-${moment().format("YYYY-MM-DDTHH:mm:ss")}.csv`).send(readers);
    } catch(err) {
        console.error(err);
        res.send(err);
    }
})

export default router;