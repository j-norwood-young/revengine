const express = require('express');
const router = express.Router();
const config = require("config");

router.post("/q/", async (req, res) => {
    const search = req.body.search;
    const fields_to_search = ["name", "email"]
    let search_fields = [];
    for (let search_field of fields_to_search) {
        let d = {};
        d[search_field] = {
            "$regex": search,
            "$options": "i"
        }
        search_fields.push(d)
    }
    try {
        const results = await req.apihelper.query("reader", { "$or": search_fields }, { fields: "first_name,last_name,email", limit: 100 })
        res.send(results);
    } catch(err) {
        console.error(err);
        res.status(500).send(err);
    }
})

module.exports = router;