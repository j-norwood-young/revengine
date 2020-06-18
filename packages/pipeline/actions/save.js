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
                for (let data of this.data) {
                    await this.postput(this.instructions.contenttype, this.instructions.key, data);
                }
            } else {
                await this.postput(this.instructions.contenttype, this.instructions.key, this.data);
            }
            return this.data;
        } catch (err) {
            console.log("Oops");
            console.error(err);
            return Promise.reject(err);
        }
    }

    async postput(contenttype, key, data) {
        const result = await jxphelper.postput(contenttype, key, data);
        this.log(result);
    }
}

module.exports = Save;