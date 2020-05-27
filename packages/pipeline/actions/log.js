const Action = require("./action")
const _ = require("highland");

class Log extends Action {
    constructor(instructions, global_data) {
        super(instructions, global_data);
        console.log(`Log construct`);
        return _.consume(this.main.bind(this));
    }

    async main(err, val, push, next) {
        console.log("Log main");
        if (err) {
            console.error(err);
            push(err);
            return next();
        }
        if (val === _.nil) {
            console.log("End of stream");
            return push(null, val);
        }
        console.log(val);
        if (val) {
            push(null, val);
        }
        next();
    }
}

module.exports = Log;