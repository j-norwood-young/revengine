const Action = require("./action")
const _ = require("highland");

class Log extends Action {
    constructor(instructions, global_data) {
        super(instructions, global_data);
        console.log(`End construct`);
        return _(this.main.bind(this));
    }

    async main(push, next) {
        console.log("Ending...");
        push(null, _.nil);
        // next();
    }
}

module.exports = Log;