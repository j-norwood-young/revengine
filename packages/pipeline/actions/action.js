class Action {
    constructor(index, instructions, global_data, debug = false) {
        this.index = index;
        this.global_data = global_data || {};
        this.instructions = instructions;
        this.next_run = false;
        this.debug = !!(debug);
    }

    run(pipeline, data) {
        this.pipeline = pipeline;
        this.data = data;
    }

    async next(data, global_data) {
        this.next_run = true;
        this.global_data = Object.assign(global_data, this.global_data);
        if (this.pipeline.length) {
            const fn = this.pipeline[0];
            return await fn(this.pipeline.slice(1), data);
        } else {
            return data;
        }
    }

    log(...params) {
        if (this.debug) console.log(...params);
    }
}

module.exports = Action;