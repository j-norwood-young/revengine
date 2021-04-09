const _ = require("lodash");
const Action = require("./action");
const JXPHelper = require("jxp-helper");
const config = require("config");
require("dotenv").config();

const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });

class Get extends Action {
    constructor(...params) {
        super(...params);
        return this.run.bind(this);
    }

    async run(...params) {
        super.run(...params);
        try {
            const tmp = _.cloneDeep(this.data);
            this.options = this.instructions.options || {};
            if (!this.options.per_page) this.options.per_page = 1000;
            this.pg = 0;
            const count = await jxphelper.count(this.instructions.collection, this.options);
            console.log({ count });
            const pages = Math.ceil(count / this.options.per_page);
            for (let page = 0; page < pages; page++) {
                const complete = page * this.options.per_page;
                const to_go = count - complete;
                const perc = complete / count * 100;
                console.log({pages, page, complete, to_go, perc});
                this.options.pg = page;
                this.data = await jxphelper.get(this.instructions.collection, this.options);
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
                const result = await this.next(this.data, this.global_data);
                console.log(result);
            }
            return [];
        } catch (err) {
            console.error(err);
            return Promise.reject(err);
        }
    }
}

module.exports = Get;