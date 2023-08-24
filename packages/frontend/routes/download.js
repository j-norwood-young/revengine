const express = require('express');
const router = express.Router();
const config = require("config");
const moment = require("moment");
const encrypt = require("@revengine/wordpress_auth").encrypt;

const opts = {
    "fields": "email,first_name,last_name,createdAt,updatedAt,label_id,segmentation_id,cc_expiry_date,cc_last4_digits,wordpress_id,paying_customer"
}

router.get("/json/:type/:_id", async (req, res) => {
    try {
        if (!["segmentation", "label"].includes(req.params.type)) {
            throw("Invalid type");
        }
        opts[`filter[${req.params.type}_id]`] = req.params._id;
        const source = (await req.apihelper.getOne(req.params.type, req.params._id)).data;
        const readers = (await req.apihelper.get("reader", opts)).data;
        res.send(readers);
    } catch(err) {
        console.error(err);
        res.send(err);
    }
})

router.get("/csv/:type/:_id", async (req, res) => {
    try {
        if (!["segmentation", "label"].includes(req.params.type)) {
            throw("Invalid type");
        }
        opts[`filter[${req.params.type}_id]`] = req.params._id;
        const source = (await req.apihelper.getOne(req.params.type, req.params._id)).data;
        const readers = (await req.apihelper.csv("reader", opts));
        res.attachment(`${source.name.toLowerCase().replace(/\s/g, "_")}-${moment().format("YYYY-MM-DDTHH:mm:ss")}.csv`).send(readers);
    } catch(err) {
        console.error(err);
        res.send(err);
    }
})

router.get("/label/csv/:label_id", async (req, res) => {
    try {
        const label = (await req.apihelper.getOne("label", req.params.label_id)).data;
        const readers = await req.apihelper.csv("reader", { "filter[label_id]": req.params.label_id, "fields": "email,first_name,last_name,createdAt,updatedAt" });
        res.attachment(`${label.name.toLowerCase().replace(" ", "_")}-${moment().format("YYYY-MM-DDTHH:mm:ss")}.csv`).send(readers);
    } catch(err) {
        console.error(err);
        res.send(err);
    }
})

router.get("/label/autologins/:label_id", async (req, res) => {
    try {
        const label = (await req.apihelper.getOne("label", req.params.label_id)).data;
        const readers = (await req.apihelper.get("reader", { "filter[label_id]": req.params.label_id, "fields": "email,wordpress_id" })).data;
        const data = [["email", "autologin"]];
        for (const reader of readers) {
            if (!reader.wordpress_id) continue;
            const token = encrypt({
                "wordpress_id": reader.wordpress_id,
                "revengine_id": reader._id,
                "email": reader.email,
            })
            data.push([
                reader.email,
                token
            ])
        }
        // console.log(data);
        const csv = require("csv-stringify");
        csv(data, (err, output) => {
            if (err) throw err;
            
            res.attachment(`${label.name.toLowerCase().replace(" ", "_")}-autologins-${moment().format("YYYY-MM-DDTHH:mm:ss")}.csv`).send(output);
        })
    } catch(err) {
        console.error(err);
        res.send(err);
    }
})


module.exports = router;