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
        const newsletter_data = await newsletter_report.list_report();
        const lists = newsletter_data.lists;
        const stats = newsletter_data.stats;
        // console.log(stats);
        // const now = new moment();
        // const last_day_filter = subscriber => moment(subscriber.date).diff(now, "day") > -1 && moment(subscriber.date).diff(now, "day") <= 0;
        // const prev_day_filter = subscriber => (moment(subscriber.date).diff(now, "day") > -2 && moment(subscriber.date).diff(now, "day") <= -1);
        // const last_week_filter = subscriber => moment(subscriber.date).diff(now, "day") > -7 && moment(subscriber.date).diff(now, "day") <= 0;
        // const prev_week_filter = subscriber => (moment(subscriber.date).diff(now, "day") > -14 && moment(subscriber.date).diff(now, "day") <= -7);
        // const last_month_filter = subscriber => moment(subscriber.date).diff(now, "day") > -30;
        // const prev_month_filter = subscriber => (moment(subscriber.date).diff(now, "day") > -60 && moment(subscriber.date).diff(now, "day") <= -30);
        // const last_2month_filter = subscriber => (moment(subscriber.date).diff(now, "day") > -60);
        // for (let list of lists) {
        //     list.active = newsletter_data.active.find(list_subscriber => list_subscriber._id === list._id);
        //     if (!list.active) continue;
        //     list.unsubscribed = newsletter_data.unsubscribed.find(list_subscriber => list_subscriber._id === list._id);
        //     list.total_active = list.active.emails.length;
        //     list.subscribers = list.active.emails.filter(last_2month_filter);
        //     // Day
        //     list.active_last_day_count = list.subscribers.filter(last_day_filter).length;
        //     list.unsubscribed_last_day_count = (list.unsubscribed) ? list.unsubscribed.emails.filter(last_day_filter).length : 0;
        //     list.unsubscribed_prev_day_count = (list.unsubscribed) ? list.unsubscribed.emails.filter(prev_day_filter).length : 0;
        //     list.active_prev_day_count = list.subscribers.filter(prev_day_filter).length;
        //     list.last_day_delta = list.active_last_day_count - list.unsubscribed_last_day_count;
        //     list.prev_day_delta = list.active_prev_day_count - list.unsubscribed_prev_day_count;
        //     list.roc_day = (list.last_day_delta - list.prev_day_delta) / list.prev_day_delta;
        //     if (list.last_day_delta < list.prev_day_delta)
        //         list.roc_day = (list.prev_day_delta - list.last_day_delta) / list.prev_day_delta
        //     // Week
        //     list.active_last_week_count = list.subscribers.filter(last_week_filter).length;
        //     list.unsubscribed_last_week_count = (list.unsubscribed) ? list.unsubscribed.emails.filter(last_week_filter).length : 0;
        //     list.unsubscribed_prev_week_count = (list.unsubscribed) ? list.unsubscribed.emails.filter(prev_week_filter).length : 0;
        //     list.active_prev_week_count = list.subscribers.filter(prev_week_filter).length;
        //     list.last_week_delta = list.active_last_week_count - list.unsubscribed_last_week_count;
        //     list.prev_week_delta = list.active_prev_week_count - list.unsubscribed_prev_week_count;
        //     list.roc_week = (list.last_week_delta - list.prev_week_delta) / list.prev_week_delta;
        //     if (list.last_week_delta < list.prev_week_delta)
        //         list.roc_week = (list.prev_week_delta - list.last_week_delta) / list.prev_week_delta
        //     // Month
        //     list.active_last_month_count = list.subscribers.filter(last_month_filter).length;
        //     list.unsubscribed_last_month_count = (list.unsubscribed) ? list.unsubscribed.emails.filter(last_month_filter).length : 0;
        //     list.unsubscribed_prev_month_count = (list.unsubscribed) ? list.unsubscribed.emails.filter(prev_month_filter).length : 0;
        //     list.active_prev_month_count = list.subscribers.filter(prev_month_filter).length;
        //     list.last_month_delta = list.active_last_month_count - list.unsubscribed_last_month_count;
        //     list.prev_month_delta = list.active_prev_month_count - list.unsubscribed_prev_month_count;
        //     list.roc_month = (list.last_month_delta - list.prev_month_delta) / list.prev_month_delta;
        //     if (list.last_month_delta < list.prev_month_delta)
        //         list.roc_month = (list.prev_month_delta - list.last_month_delta) / list.prev_month_delta
        // }

        // lists.sort((a, b) => b.total_active - a.total_active);
        
        // const now = new moment();
        // for (let subscriber of newsletter_data.subscribers.slice(0, 10)) {
        //     console.log(moment(subscriber.date).diff(now, "week"))
        // }
        
        // console.log(newsletter_data.campaigns);
        // const articles = (await jxphelper.get("article", { fields: "urlid,author,title,date_published" })).data;
        const template = pug.compileFile(path.join(__dirname, "./templates/newsletter-management.pug"));
        return template({ moment, numberFormat, stats, lists });
    } catch (err) {
        console.error(err);
        return "";
    }
}
// program.watch = true;

if (program.watch) {
    http.createServer(async (req, res) => {
        res.setHeader('Content-type', 'text/html');
        try {
            const s = await content();
            res.end(s);
        } catch (err) {
            console.error(err);
            res.statusCode(500);
            res.statusMessage("Error");
            res.end("An error occured");
        }
    }).listen(program.port || config.mailer.port || 3019);
};

if (!program.watch && program.to) {
    main().catch(console.error);
}

module.exports = { content }