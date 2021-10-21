const config = require("config");
require("dotenv").config();
const pug = require("pug");
const path = require("path");
const moment = require("moment-timezone");
const Reports = require("@revengine/reports");
const numberFormat = new Intl.NumberFormat(config.locale || "en-GB", { maximumFractionDigits: 1 });

moment.tz.setDefault(config.timezone || "UTC");

const content = async () => {
    try {
        const newsletter_report = new Reports.Newsletter();
        const newsletter_data = await newsletter_report.list_report();
        const lists = newsletter_data.lists;
        const stats = newsletter_data.stats.filter(n => n.new_active_subscribers_this_month);
        const template = pug.compileFile(path.join(__dirname, "../templates/newsletter_management_report.pug"));
        return template({ moment, numberFormat, stats, lists });
    } catch (err) {
        console.error(err);
        return "";
    }
}

module.exports = { content }