import express from 'express';
const router = express.Router();
import config from "config";
import { createCanvas } from 'canvas';
import esclient from "@revengine/common/esclient.js";
import Charts from "../libs/charts.js";
const charts = new Charts();

router.get("/canvas_test", async(req, res) => {
    try {
        const canvas = createCanvas(200, 200);
        const ctx = canvas.getContext('2d');

        // Write "Awesome!"
        ctx.font = '30px Impact';
        ctx.rotate(0.1);
        ctx.fillText('Awesome!', 50, 100);

        // Draw line under text
        var text = ctx.measureText('Awesome!');
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.lineTo(50, 102);
        ctx.lineTo(50 + text.width, 102);
        ctx.stroke();
        res.send('<img src="' + canvas.toDataURL() + '" />');
        // Draw cat with lime helmet
        // loadImage('examples/images/lime-cat.jpg').then((image) => {
        //     ctx.drawImage(image, 50, 0, 70, 70)

        //     console.log('<img src="' + canvas.toDataURL() + '" />')
        // })
    } catch(err) {
        console.error(err);
        res.status(500).send({ error: err });
    }
});

router.get("/graph/timespent", async(req, res) => {
    try {
        let q_timespent = {
            index: "pageviews_time_spent",
            body: {
                "size": 0,
                "query": {
                    "range": {
                        "time": {
                            "gte": "now-7d/d",
                            "lt": "now/d"
                        }
                    }
                },
                "aggs": {
                    "timespent": {
                        "date_histogram": {
                            "field": "time",
                            "interval": "day"
                        },
                        "aggs": {
                            "timespent_avg": {
                                "avg": {
                                    "field": "timespent"
                                }
                            },
                            "timespent_sum": {
                                "sum": {
                                    "field": "timespent"
                                }
                            }
                        }
                    }
                }
            }
        };
        const timespent_result = await esclient.search(q_timespent);
        charts.drawHistogram("line", timespent_result.aggregations.timespent, "timespent_avg", "rgba(66, 245, 182, 1)", "Avg Time Spent / Article", "day");
        res.send('<img src="' + charts.toDataURL() + '" />');
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: err });
    }
})

router.get("/graph/progress", async (req, res) => {
    try {
        const unit = "day";
        let q_progress = {
            index: "pageviews_progress",
            body: {
                "size": 0,
                "query": {
                    "range": {
                        "time": {
                            "gte": "2020-02-01",
                            "lt": "now/d"
                        }
                    }
                },
                "aggs": {
                    "article_progress": {
                        "date_histogram": {
                            "field": "time",
                            "interval": unit
                        },
                        "aggs": {
                            "article_progress_avg": {
                                "avg": {
                                    "field": "article_progress"
                                }
                            }
                        }
                    }
                }
            }
        };
        const progress_result = await esclient.search(q_progress);
        const canvas = createCanvas(800, 400);
        
        console.log(progress_result.aggregations.timespent);
        charts.drawArticleProgress(progress_result.aggregations.article_progress, null, unit);
        res.send('<img src="' + canvas.toDataURL() + '" />');
    } catch (err) {
        console.error(err);
        res.status(500).send({ error: err });
    }
})

router.get("/articles", async (req, res) => {
    try {
        let q_timespent = {
            index: "pageviews_time_spent",
            body: {
                "size": 0,
                    "query": {
                    "range" : {
                        "time": {
                            "gte" : "now-7d/d",
                                "lt" : "now/d"
                        }
                    }
                },
                "aggs" : {
                    "timespent" : {
                        "date_histogram": {
                            "field": "time",
                                "interval": "day"
                        },
                        "aggs": {
                            "timespent_avg": {
                                "avg": {
                                    "field": "timespent"
                                }
                            },
                            "timespent_sum": {
                                "sum": {
                                    "field": "timespent"
                                }
                            }
                        }
                    }
                }
            }
        };
        const timespent_result = await esclient.search(q_timespent);
        
        let q_article_progress = {
            index: "pageviews_progress",
            body: {
                "size": 0,
                "query": {
                    "range": {
                        "time": {
                            "gte": "now-7d/d",
                            "lt": "now/d"
                        }
                    }
                },
                "aggs": {
                    "article_progress": {
                        "date_histogram": {
                            "field": "time",
                            "interval": "day"
                        },
                        "aggs": {
                            "article_progress_avg": {
                                "avg": {
                                    "field": "article_progress"
                                }
                            }
                        }
                    }
                }
            }
        };
        const progress_result = await esclient.search(q_article_progress);


    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
})

export default router;