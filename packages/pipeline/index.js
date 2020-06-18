const cron = require("node-cron");
const streamrunner = require("./libs/streamrunner");
const Apihelper = require("jxp-helper");
const config = require("config");
require("dotenv").config();
const apihelper = new Apihelper({ server: config.api.server, apikey: process.env.APIKEY });
const schedule = "* * * * *";
const crypto = require('crypto');

const main = () => {
    let schedules = [];
    let hash = "";
    cron.schedule(schedule, async () => {
        // console.log("Checking pipeline...");
        const pipelines = (await apihelper.get("pipeline", { fields: "pipeline,cron,name" })).data;
        const newhash = crypto.createHash('md5').update(JSON.stringify(pipelines)).digest("hex");
        if (newhash !== hash) {
            console.log("Pipeline changed");
            hash = newhash;
            while (schedules.length) {
                let schedule = schedules.pop();
                schedule.destroy();
            }
            for (let pipeline of pipelines) {
                let schedule = cron.schedule(pipeline.cron, async () => {
                    let running = (await apihelper.getOne("pipeline", pipeline._id)).running;
                    if (running) return;
                    console.log(`Running ${pipeline.name}`);
                    const d_start = new Date();
                    await apihelper.put("pipeline", pipeline._id, { running: true, run_start: d_start });
                    const result = await streamrunner(eval(pipeline.pipeline));
                    const d_end = new Date();
                    await apihelper.put("pipeline", pipeline._id, { running: false, last_run_start: d_start, last_run_end: d_end, last_run_result: result.slice(0, 3) });
                    console.log(`Completed ${pipeline.name}, took ${d_end - d_start}`);
                });
                schedules.push(schedule);
            }
        }
    })
    
    // const schedules = [];
    // for (let pipeline of pipelines) {
    //     console.log(`Scheduling ${pipeline.name} for ${pipeline.cron}`)
    //     let schedule = cron.schedule(pipeline.cron, async () => {
    //         let running = (await apihelper.getOne("pipeline", pipeline._id)).running;
    //         if (running) continue;
    //         console.log(`Running ${pipeline.name}`);
    //         const d_start = new Date();
    //         await apihelper.put("pipeline", pipeline._id, { running: true, run_start: d_start });
    //         const result = await streamrunner(eval(pipeline.pipeline));
    //         const d_end = new Date();
    //         await apihelper.put("pipeline", pipeline._id, { running: false, last_run_start: d_start, last_run_end: d_end, last_run_result: result.slice(0,3) });
    //         console.log(`Completed ${pipeline.name}, took ${d_end - d_start}`);
    //     })
    //     schedules.push(schedule);
    // }
}

main();