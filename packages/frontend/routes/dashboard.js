const express = require('express');
const router = express.Router();
const Reports = require("@revengine/reports");


router.get("/", async (req, res) => {
    try {
        const labels = (await req.apihelper.get("label")).data;
        for (let label of labels) {
            const result = (await req.apihelper.aggregate("reader", [{ "$match": { "label_id": `ObjectId(\"${label._id}\")` } }, { "$count": "count" } ])).data.pop();
            console.log(result);
            label.length = result ? result.count : 0;
        }
        labels.sort((a, b) => b.length - a.length);
        res.render("dashboard", { title: "Dashboard", labels });
    } catch(err) {
        console.error(err);
        res.render("error", err);
    }
});

router.get("/daily_email", async(req, res) => {
    res.render("reports/daily_email", { title: "Daily Email Report"});
});

router.get("/article_hits", async(req, res) => {
    try {
        let interval = req.query.interval || "minute";
        const data = await (new Reports.Hits24H()).run(interval);
        res.send(data);
    } catch(err) {
        console.error(err);
        res.status(500).send({ error: err });
    }

})
module.exports = router;