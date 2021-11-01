const Action = require("./action")
const fetch = require("node-fetch")
const _ = require("lodash");

class Fetch extends Action {
    constructor(...params) {
        super(...params);
        return this.run.bind(this);
    }

    async run(...params) {
        super.run(...params);
        try {
            const tmp = _.cloneDeep(this.data);
            this.options = this.instructions.options || {};
            const url = this.instructions.request(this);
            if (!url) return null;
            this.data = await fetch(url, this.options);
            if (this.instructions.parse) {
                this.log("Parsing", this.index);
                this.data = await this.instructions.parse(this);
            }
            if (this.instructions.transform) {
                this.log("Transforming", this.index);
                this.data = await this.instructions.transform(this);
            }
            if (this.instructions.map) {
                this.log("Mapping", this.index);
                this.data = this.data.map(this.instructions.map.bind(this));
            }
            if (this.instructions.reduce) {
                this.log("Reducing", this.index);
                this.data = this.data.reduce(...this.instructions.reduce)
            }
            if (this.instructions.global) {
                this.log("Setting global data");
                this.global_data = this.data;
                this.data = tmp;
            }
            if (!this.next_run) {
                return await this.next(this.data, this.global_data);
            }
            return this.data;
        } catch(err) {
            console.error(err);
            console.log(this.options || "No options found");
            return Promise.reject(err);
        }
    }
}

module.exports = Fetch;