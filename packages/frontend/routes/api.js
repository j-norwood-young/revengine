const express = require('express');
const router = express.Router();
const config = require("config");

router.get("/user/wordpress_id/:wordpress_id", async (req, res) => {
    const reader = (await req.apihelper.get("reader", { "filter[wordpress_id]": req.params.wordpress_id })).data.pop();
    res.send({ labels: reader.labels });
});

module.exports = router;