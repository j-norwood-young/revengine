const Action = require("./action")
const fetch = require("node-fetch")
const _ = require("highland");

class Fetch extends Action {
    constructor(instructions, global_data) {
        super(instructions, global_data);
        console.log(`Fetch construct`);
        return _(this.main.bind(this));
    }

    async main(push, next) {
        console.log("main");
        try {
            const result = await fetch(this.instructions.request);
            let data = await result.json();
            console.log({ data });
            if (this.instructions.transform) {
                data = await this.instructions.transform(data);
            }
            this.data = data || [];
            push(null, this.data);
            push(null, _.nil);
            // next();
        } catch(err) {
            push(err);
        }
    }
}

module.exports = Fetch;