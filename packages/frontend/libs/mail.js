const config = require("config")
const nodemailer = require("nodemailer")

class Mail {
    constructor() {
        this.transport = nodemailer.createTransport(config.smtp);
    }

    async send(data) {
        try {
            if (!data.to) throw ("To required");
            if (!data.subject) throw ("Subject required");
            if (!data.content) throw ("Content required");
            let msgdata = Object.assign({
                from: config.smtp.from,
                html: data.content,
                text: data.content
            }, data)
            const result = await this.transport.sendMail(msgdata)
            return result;
        } catch(err) {
            return Promise.reject(err);
        }
    }
}

module.exports = Mail;