class Action {
    constructor(instructions, global_data) {
        console.log(`Action construct`);
        this.global_data = global_data || {};
        this.instructions = instructions;
    }
}

module.exports = Action;