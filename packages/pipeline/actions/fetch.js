const Action = require("./action")
const fetch = require("node-fetch")

class Fetch extends Action {
    constructor(...params) {
        super(...params);
        return this.run.bind(this);
    }

    async run(...params) {
        super.run(...params);
        try {
            this.options = this.instructions.options || {};
            this.data = await fetch(this.instructions.request(this), this.options);
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
            if (!this.next_run) {
                return await this.next(this.data);
            }
            return this.data;
        } catch(err) {
            console.log("Oops");
            console.error(err);
            return Promise.reject(err);
        }
    }
}

module.exports = Fetch;