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
            let resolved_data = [];
            for (let data of this.data) {
                resolved_data.push(await Promise.resolve(data));
            }
            console.log({ data: resolved_data });
        } else {
            console.log({ data: await Promise.resolve(this.data) });
        }
        return await this.next(this.data);
    }
}

module.exports = Log;