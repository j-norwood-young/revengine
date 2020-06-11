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
            this.data = await fetch(this.instructions.request(this));
            if (this.instructions.parse) {
                console.log("Parsing", this.index);
                this.data = await this.instructions.parse(this);
            }
            if (this.instructions.transform) {
                console.log("Transforming", this.index);
                this.data = await this.instructions.transform(this);
            }
            if (this.instructions.map) {
                console.log("Mapping", this.index);
                this.data = this.data.map(this.instructions.map.bind(this));
            }
            if (this.instructions.reduce) {
                console.log("Reducing", this.index);
                this.data = this.data.reduce(...this.instructions.reduce)
            }
            if (!this.next_run) {
                return await this.next(this.data);
            }
            return this.data;
        } catch(err) {
            console.error(err);
            return Promise.reject(err);
        }
    }
}

module.exports = Fetch;