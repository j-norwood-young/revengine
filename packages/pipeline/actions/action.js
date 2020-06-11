class Action {
    constructor(index, instructions, global_data) {
        this.index = index;
        this.global_data = global_data || {};
        this.instructions = instructions;
        this.next_run = false;
    }

    run(pipeline, data) {
        this.pipeline = pipeline;
        this.data = data;
    }

    async next(data) {
        this.next_run = true;
        if (this.pipeline.length) {
            const fn = this.pipeline[0];
            return await fn(this.pipeline.slice(1), data);
        } else {
            return data;
        }
    }
}

module.exports = Action;