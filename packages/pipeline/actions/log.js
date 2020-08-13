const Action = require("./action")

class Log extends Action {
    constructor(...params) {
        super(...params);
        return this.run.bind(this);
    }

    async run(...params) {
        super.run(...params);
        console.log({ index: this.index });
        console.log({ global_data: this.global_data });
        if (Array.isArray(this.data)) {
            for (let data of this.data) {
                const resolved_data = await Promise.resolve(data);
            } 
        } else {
            console.log({ data: Promise.resolve(this.data) });
        }
        return await this.next(this.data);
    }
}

module.exports = Log;