const Action = require("./action");
const JXPHelper = require("jxp-helper");
const config = require("config");
require("dotenv").config();

const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });

class Save extends Action {
    constructor(...params) {
        super(...params);
        return this.run.bind(this);
    }

    async run(...params) {
        super.run(...params);
        try {
            if (Array.isArray(this.data)) {
                const resolved_data = await Promise.all(this.data);
                let result = [];
                const pages = Math.ceil(resolved_data.length / 1000);
                for(let x = 0; x < pages; x++) {
                    // console.log(x, "/", pages, resolved_data.length);
                    result.push(await jxphelper.bulk_postput(this.instructions.collection, this.instructions.key, resolved_data.splice(0, 1000)));
                }
                return [result];
            } else {
                const resolved_data = await Promise.resolve(this.data);
                await jxphelper.postput(this.instructions.collection, this.instructions.key, resolved_data);
                return this.data;
            }
        } catch (err) {
            console.log("Oops");
            console.error(err);
            return Promise.reject(err);
        }
    }
}

module.exports = Save;