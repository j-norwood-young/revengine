import express from 'express';
const router = express.Router();
import { Hits24H } from "@revengine/reports";


router.get("/", async (req, res) => {
    try {
        const labels = (await req.apihelper.get("label", { "filter[display_on_dashboard]": true })).data;
        labels.sort((a, b) => b.last_count - a.last_count);
        res.render("dashboard", { title: "Dashboard", labels, pg: "dashboard" });
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
        const data = await (new Hits24H()).run(interval);
        res.send(data);
    } catch(err) {
        console.error(err);
        res.status(500).send({ error: err });
    }

})
export default router;