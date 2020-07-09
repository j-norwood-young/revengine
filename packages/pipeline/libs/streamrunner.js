const actions = {
    fetch: require("../actions/fetch"),
    map: require("../actions/map"),
    log: require("../actions/log"),
    save: require("../actions/save"),
    save_raw: require("../actions/save_raw"),
    get: require("../actions/get"),
    // merge: highland.merge,
    // map: highland.map,
    // link: require("../actions/link"),
    // map: require("../actions/map"),
    // mock: require("../actions/mock"),
    // reduce: require("../actions/reduce"),
    
    // test: require("../actions/test"),
}

module.exports = async (pipeline, debug = false) => {
    try {
        if (!Array.isArray(pipeline)) throw("pipeline must be array");
        let data = [];
        let global_data = {};
        let pipeline_fns = [];
        for (let i in pipeline) {
            const stage = pipeline[i];
            pipeline_fns.push(new actions[stage.action](i, stage.instructions, global_data, debug));
        }
        const first = pipeline_fns.shift();
        data = await first(pipeline_fns, data, global_data);
        return data;
    } catch(err) {
        return Promise.reject(err);
    }
}