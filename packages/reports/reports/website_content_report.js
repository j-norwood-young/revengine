const config = require("config");
require("dotenv").config();
const pug = require("pug");
const path = require("path");
const moment = require("moment-timezone");
const Reports = require("@revengine/reports");
const numberFormat = new Intl.NumberFormat(config.locale || "en-GB", { maximumFractionDigits: 1 });

const authors_to_exclude = [
    "Reuters",
    "Bloomberg"
];

const sections_to_exclude = [
    "Newsdeck"
]

moment.tz.setDefault(config.timezone || "UTC");

const filter_articles = article => {
    if (authors_to_exclude.includes(article.author)) return false;
    for (let section of article.sections) {
        if (sections_to_exclude.includes(section)) return false;
    }
    return true;
}

const content = async () => {
    try {
        const day_start_days_ago = 2;
        const day_end_days_ago = 1;
        const week_start_days_ago = 9;
        const week_end_days_ago = 2;
        const month_start_days_ago = 32;
        const month_end_days_ago = 2;

        // Articles
        const article_report = new Reports.ArticleHits();
        const one_day = await article_report.run(day_start_days_ago, day_end_days_ago);
        const one_week = await article_report.run(week_start_days_ago, week_end_days_ago);
        const template = pug.compileFile(path.join(__dirname, "../templates/website_content_report.pug"));
        const top_articles_one_day = one_day.filter(filter_articles).slice(0,5);
        const bottom_articles_one_day = one_day.filter(filter_articles).slice(-5).sort((a,b) => a.peak.count - b.peak.count);
        const top_articles_one_week = one_week.filter(filter_articles).slice(0, 5);
        const bottom_articles_one_week = one_week.filter(filter_articles).slice(-5).sort((a,b) => a.peak.count - b.peak.count);
        
        // Tags
        const tag_report = new Reports.ArticleTags();
        let tags_one_week = await tag_report.run(week_start_days_ago, week_end_days_ago);
        const tags_one_month = await tag_report.run(month_start_days_ago, month_end_days_ago);
        const compare_report = new Reports.CompareFeatures();
        tags_one_week = compare_report.compare_position(tags_one_week, tags_one_month);

        // Sections
        const section_report = new Reports.ArticleSections();
        const sections_one_week = await section_report.run(week_start_days_ago, week_end_days_ago);
        const sections_one_month = await section_report.run(month_start_days_ago, month_end_days_ago);

        // Long Tail Articles
        const long_tail_report = new Reports.ArticleLongTails()
        const long_tails = await long_tail_report.run();

        // Per Section
        const sectionset = new Set();
        for (let article of article_report.articles) {
            sectionset.add(...article.sections);
        }
        let sections = [...sectionset].sort().filter(section => !sections_to_exclude.includes(section));
        const top_articles_per_section = {};
        const bottom_articles_per_section = {};
        for (let section of sections) {
            top_articles_per_section[section] = one_week.filter(article => article.sections.includes(section)).filter(filter_articles).slice(0, 5);
            bottom_articles_per_section[section] = one_week.filter(article => article.sections.includes(section)).filter(filter_articles).slice(-5).sort((a,b) => a.peak.count - b.peak.count);
        }

        // console.log(top_articles_per_section);
        // console.log({ day_start_days_ago, day_end_days_ago, week_start_days_ago, week_end_days_ago, month_start_days_ago, month_end_days_ago });
        return template({ moment, numberFormat, top_articles_one_day, bottom_articles_one_day, top_articles_one_week, bottom_articles_one_week, tags_one_week, tags_one_month, sections_one_week, sections_one_month, long_tails, sections, top_articles_per_section, bottom_articles_per_section , day_start_days_ago, day_end_days_ago, week_start_days_ago, week_end_days_ago, month_start_days_ago, month_end_days_ago });
    } catch (err) {
        console.error(err);
        return "";
    }
}

module.exports = { content }