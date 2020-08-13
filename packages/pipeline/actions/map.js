const Action = require("./action")

class Map extends Action {
    constructor(...params) {
        super(...params);
        return this.run.bind(this);
    }

    async run(...params) {
        super.run(...params);
        try {
            this.data.map(this.instructions.bind(this));
            if (!this.next_run) {
                return await this.next(this.data);
            }
        } catch (err) {
            console.error(err);
            return Promise.reject(err);
        }
    }
}

module.exports = Map;