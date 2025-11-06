import config from "config";
import nodemailer from "nodemailer";

class Mail {
    constructor() {
        const auth = {};
        if (process.env.SMTP_USER) {
            auth.user = process.env.SMTP_USER;
        }
        if (process.env.SMTP_PASS) {
            auth.pass = process.env.SMTP_PASS;
        }
        const smtp = Object.assign({
            sendmail: true,
            newline: 'unix',
            path: '/usr/sbin/sendmail',
            auth
        }, config.mailer ? config.mailer.smtp : {});
        this.transport = nodemailer.createTransport(smtp);
    }

    async send(data) {
        try {
            if (!data.to) throw ("To required");
            if (!data.subject) throw ("Subject required");
            if (!data.content) throw ("Content required");
            let msgdata = Object.assign({
                from: config.mailer.from,
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

export default Mail;