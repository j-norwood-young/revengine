const util = require("util");
const stream = require("stream");
const Pipeline = util.promisify(stream.pipeline);
const highland = require("highland");

const actions = {
    fetch: require("../actions/fetch"),
    log: require("../actions/log"),
    end: require("../actions/end"),
    // link: require("../actions/link"),
    // map: require("../actions/map"),
    // mock: require("../actions/mock"),
    // reduce: require("../actions/reduce"),
    // save: require("../actions/save"),
    // test: require("../actions/test"),
}

module.exports = def => {
    try {
        if (!Array.isArray(def)) throw("Pipeline definition must be array");
        const pipeline = [];
        let global_data = {};
        for(let stage of def) {
            console.log(`Queuing ${stage.action}`);
            pipeline.push(new actions[stage.action](stage.instructions, global_data));
        }
        return highland.pipeline(...pipeline).collect().toPromise(Promise);
    } catch(err) {
        return Promise.reject(err);
    }
}