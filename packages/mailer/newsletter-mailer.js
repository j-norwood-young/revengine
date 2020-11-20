const config = require("config");
require("dotenv").config();
const nodemailer = require("nodemailer");
const pug = require("pug");
const fs = require("fs").promises;
const path = require("path");
const http = require("http");
const JXPHelper = require("jxp-helper");
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const moment = require("moment-timezone");
const Reports = require("@revengine/reports");
const numberFormat = new Intl.NumberFormat(config.locale || "en-GB");
const program = require('commander');

moment.tz.setDefault(config.timezone || "UTC");

program
    .option('-v, --verbose', 'verbose debugging')
    .option('-w, --watch', 'start up a server to watch template')
    .option('-p, --port <number>', 'port for server')
    .option('-t, --to <items>', 'emails to send to (comma-seperated)')
    .option('-f, --from <email>', 'email to send from')
    .option('-s, --subject <subject>', 'email subject')
    .option('-r, --report <mail-template>', 'report to send');

program.parse(process.argv);

console.log('Options: ', program.opts());

const main = async () => {
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
    let transporter = nodemailer.createTransport(smtp);

    let html = await content();
    let info = await transporter.sendMail({
        from: program.from || config.mailer ? config.mailer.from : "revengine@revengine.dailymaverick.co.za",
        to: program.to,
        subject: program.subject || "Revengine",
        text: "A Revengine Report",
        html
    });

    console.log("Message sent: %s", info.messageId);
}

const content = async () => {
    try {
        const newsletter_report = new Reports.Newsletter();
        const newsletter_data = await newsletter_report.run();
        // console.log(newsletter_data.campaigns);
        const articles = (await jxphelper.get("article", { fields: "urlid,author,title,date_published" })).data;
        const template = pug.compileFile(path.join(__dirname, "./templates/newsletters.pug"));
        return template({ moment, numberFormat, newsletter_data, articles });
    } catch (err) {
        console.error(err);
        return "";
    }
}

if (program.watch) {
    http.createServer(async (req, res) => {
        res.setHeader('Content-type', 'text/html');
        try {
            const s = await content();
            res.end(s);
        } catch(err) {
            console.error(err);
            res.statusCode(500);
            res.statusMessage("Error");
            res.end("An error occured");
        }
    }).listen(program.port || config.mailer.port || 3017);
};

if (!program.watch) {
    main().catch(console.error);
}