const cron = require("node-cron");
const http = require("http");
const streamrunner = require("./libs/streamrunner");
const Apihelper = require("jxp-helper");
const config = require("config");
require("dotenv").config();
const apihelper = new Apihelper({ server: config.api.server, apikey: process.env.APIKEY });
const schedule = "* * * * *";
const crypto = require('crypto');
const server = require("@revengine/http_server");

const run_pipeline = async pipeline_id => {
    const d_start = new Date();
    try {
        const pipeline = (await apihelper.getOne("pipeline", pipeline_id)).data;
        if (pipeline.running) return {
            result: "warning",
            msg: "Pipeline already running"
        };
        console.log(`Running ${pipeline.name}`);
        await apihelper.put("pipeline", pipeline._id, { running: true, run_start: d_start });
        const result = await streamrunner(eval(pipeline.pipeline));
        const d_end = new Date();
        await apihelper.put("pipeline", pipeline._id, { running: false, last_run_start: d_start, last_run_end: d_end, last_run_result: JSON.stringify(result.slice(0, 3)) });
        console.log(`Completed ${pipeline.name}, took ${d_end - d_start}`);
        return {
            result: "success",
            msg: `Completed ${pipeline.name}, took ${d_end - d_start}`,
            pipeline,
            last_run_start: d_start,
            last_run_end: d_end,
            last_run_result: JSON.stringify(result.slice(0, 3))
        }
    } catch (err) {
        const d_end = new Date();
        await apihelper.put("pipeline", pipeline_id, { running: false, last_run_start: d_start, last_run_end: d_end, last_run_result: JSON.stringify(err) });
        throw (err);
    }
}

const healthcheck = async () => { // Healthcheck
    const moreThanOneHourAgo = (date) => {
        const HOUR = 1000 * 60 * 60;
        const anHourAgo = Date.now() - HOUR;
        return new Date(date) < anHourAgo;
    }
    const running_pipelines = (await apihelper.get("pipeline", { fields: "running,run_start,name" })).data.filter(pipeline => pipeline.running).filter(pipeline => {
        return moreThanOneHourAgo(pipeline.run_start);
    });
    for (let pipeline of running_pipelines) {
        try {
            console.log(`Unlocking blocked pipeline`, pipeline.name);
            await apihelper.put("pipeline", pipeline._id, { "running": false });
        } catch(err) {
            console.error(err);
        }
    }
}

const scheduler = () => {
    let schedules = [];
    let hash = "";
    cron.schedule(schedule, async () => {
        const pipelines = (await apihelper.get("pipeline", { "filter[autorun]": true, fields: "pipeline,cron,name" })).data;
        const newhash = crypto.createHash('md5').update(JSON.stringify(pipelines)).digest("hex");
        if (newhash !== hash) {
            console.log("Pipeline changed");
            hash = newhash;
            while (schedules.length) {
                let schedule = schedules.pop();
                schedule.destroy();
            }
            for (let pipeline of pipelines) {
                let schedule = cron.schedule(pipeline.cron, () => {
                    try {
                        run_pipeline(pipeline._id)
                    } catch(err) {
                        console.error(err);
                    }
                });
                schedules.push(schedule);
            }
        }
    })
    cron.schedule("0 * * * *", healthcheck)
}

server.get("/run/:pipeline_id", async (req, res, next) => {
    try {
        const pipeline_id = req.params.pipeline_id;
        const result = await run_pipeline(pipeline_id);
        res.send(result);
    } catch(err) {
        console.error(err);
        res.send("An error occured");
    }
});

server.listen(config.pipeline.port || 3018, function () {
    console.log('%s listening at %s', server.name, server.url);
});

scheduler();