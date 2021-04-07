const config = require("config");
require("dotenv").config();
const pug = require("pug");
const path = require("path");
const JXPHelper = require("jxp-helper");
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const moment = require("moment-timezone");
const Reports = require("@revengine/reports");
const numberFormat = new Intl.NumberFormat(config.locale || "en-GB");

moment.tz.setDefault(config.timezone || "UTC");

const content = async () => {
    try {
        console.time("content_report");
        const newsletter_report = new Reports.Newsletter();
        const newsletter_data = await newsletter_report.run();
        console.timeLog("content_report");
        const articles = (await jxphelper.get("article", { fields: "urlid,author,title,date_published" })).data;
        console.timeLog("content_report");
        const template = pug.compileFile(path.join(__dirname, "../templates/newsletter_content_report.pug"));
        console.timeEnd("content_report");
        return template({ moment, numberFormat, newsletter_data, articles });
    } catch (err) {
        console.error(err);
        return "";
    }
}

module.exports = { content }