const config = require("config");
require("dotenv").config();
const nodemailer = require("nodemailer");
const pug = require("pug");
const fs = require("fs").promises;
const path = require("path");
const http = require("http");
const JXPHelper = require("jxp-helper");
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const moment = require("moment");
const Reports = require("@revengine/reports");
const numberFormat = new Intl.NumberFormat(config.locale || "en-GB");
const program = require('commander');

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
console.log('Remaining arguments: ', program.args);

const main = async () => {
    const smtp = Object.assign({
        sendmail: true,
        newline: 'unix',
        path: '/usr/sbin/sendmail'
    }, config.mailer ? config.mailer.smtp : {});
    let transporter = nodemailer.createTransport(smtp);

    let html = await content();
    // console.log(html);
    let info = await transporter.sendMail({
        from: config.mailer.from,
        to: program.to,
        subject: program.subject || "Revengine",
        text: "A Revengine Report",
        html
    });

    console.log("Message sent: %s", info.messageId);
}

const daily_churn = async () => {
    try {
        // const memberships_week = (await jxphelper.get("woocommerce_membership", { "sort[date_created]": -1, limit: 1000, "filter[start_date:]": `$gte: ${moment().subtract(2, "day").startOf("day").format("YYYY-MM-DD")}` })).data;
        // console.log({ memberships_week });
        // const memberships_month = (await jxphelper.get("woocommerce_membership", { "sort[date_created]": -1, limit: 1000, "filter[start_date:]": `$gte: ${moment().subtract(28, "day").startOf("day").format("YYYY-MM-DD")}` })).data;
        // const avg_total_weekly = memberships_month.reduce((prev, cur) => {
        //     prev += cur.total;
        // }, 0) / 4;
        // const total = memberships_week.reduce((prev, cur) => {
        //     console.log(cur);
        //     prev += cur.total;
        // }, 0);
        // const avg_count_weekly = memberships_month.length / 4;
        const template = pug.compileFile(path.join(__dirname, "./templates/daily_churn.pug"));
        return template({ memberships_week: 1, memberships_month: 1, avg_count_weekly: 1, avg_total_weekly: 1, total: 1 });
    } catch(err) {
        console.error(err);
        return "";
    }
}

const content = async () => {
    try {
        // Articles
        const article_report = new Reports.ArticleHits();
        const one_day = await article_report.run(1, 1);
        const one_week = await article_report.run(8, 1);
        const template = pug.compileFile(path.join(__dirname, "./templates/content.pug"));
        const top_articles_one_day = one_day.slice(0,5);
        const bottom_articles_one_day = one_day.slice(-5);
        const top_articles_one_week = one_week.slice(0, 5);
        const bottom_articles_one_week = one_week.slice(-5);
        
        // Tags
        const tag_report = new Reports.ArticleTags();
        let tags_one_week = await tag_report.run(8, 1);
        const tags_one_month = await tag_report.run(31, 1);
        const compare_report = new Reports.CompareFeatures();
        tags_one_week = compare_report.compare_position(tags_one_week, tags_one_month);

        // Sections
        const section_report = new Reports.ArticleSections();
        const sections_one_week = await section_report.run(8, 1);
        const sections_one_month = await section_report.run(31, 1);

        // Long Tail Articles
        const long_tail_report = new Reports.ArticleLongTails()
        const long_tails = await long_tail_report.run();
        console.log(long_tails);
        return template({ moment, numberFormat, top_articles_one_day, bottom_articles_one_day, top_articles_one_week, bottom_articles_one_week, tags_one_week, tags_one_month, sections_one_week, sections_one_month, long_tails });
    } catch (err) {
        console.error(err);
        return "";
    }
}

if (program.watch) {
    http.createServer(async (req, res) => {
        const s = await content();
        res.setHeader('Content-type', 'text/html');
        res.end(s);
    }).listen(program.port || config.mailer.port || 3017);
};

if (!program.watch) {
    main().catch(console.error);
}