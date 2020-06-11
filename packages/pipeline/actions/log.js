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
        console.log({ data: this.data });
        return await this.next(this.data);
    }
}

module.exports = Log;