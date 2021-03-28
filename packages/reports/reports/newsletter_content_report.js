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
        const newsletter_report = new Reports.Newsletter();
        const newsletter_data = await newsletter_report.run();
        const articles = (await jxphelper.get("article", { fields: "urlid,author,title,date_published" })).data;
        const template = pug.compileFile(path.join(__dirname, "../templates/newsletter_content_report.pug"));
        return template({ moment, numberFormat, newsletter_data, articles });
    } catch (err) {
        console.error(err);
        return "";
    }
}

module.exports = { content }