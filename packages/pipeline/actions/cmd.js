const Action = require("./action")
const { spawn, exec } = require("child_process");

// Run arbitrary commands on the server
class Cmd extends Action {
    constructor(...params) {
        super(...params);
        return this.run.bind(this);
    }

    async run(...params) {
        super.run(...params);
        const cmd = this.instructions.cmd;
        this.data = await new Promise((resolve, reject) => {
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    return reject(err);
                }
                if (stderr) {
                    return reject(stderr);
                }
                return resolve(stdout);
            });
        })
    }
}

module.exports = Cmd;