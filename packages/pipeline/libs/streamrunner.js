const util = require("util");
const stream = require("stream");

const actions = {
    fetch: require("../actions/fetch"),
    map: require("../actions/map"),
    log: require("../actions/log"),

    // merge: highland.merge,
    // map: highland.map,
    // link: require("../actions/link"),
    // map: require("../actions/map"),
    // mock: require("../actions/mock"),
    // reduce: require("../actions/reduce"),
    // save: require("../actions/save"),
    // test: require("../actions/test"),
}

module.exports = async (pipeline) => {
    try {
        if (!Array.isArray(pipeline)) throw("pipeline must be array");
        let data = [];
        let global_data = {};
        let pipeline_fns = [];
        for (let i in pipeline) {
            const stage = pipeline[i];
            pipeline_fns.push(new actions[stage.action](i, stage.instructions, global_data));
        }
        const first = pipeline_fns.shift();
        data = await first(pipeline_fns, data);
        return data;
    } catch(err) {
        return Promise.reject(err);
    }
}