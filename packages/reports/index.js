// Generate a report of article performance for the last 7 days
const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const moment = require("moment-timezone");
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
moment.tz.setDefault(config.timezone || "UTC");

const get_hits = async (start_date, end_date) => {
    const result = (await jxphelper.get("article", { "filter[date_published]": `$lte:${end_date.toISOString()}`, "filter[date_published]": `$gte:${start_date.toISOString()}`, "filter[hits]": "$exists:1" })).data.filter(article => article.hits.length);
    return result;
}

class ArticleHits {
    constructor(opts) {
        opts = Object.assign(opts || {}, {
            // Defaults here
        });
    }

    async peak (hits) {
        let max = Math.max(...hits.map(hit => hit.count));
        let peak = hits.find(hit => hit.count === max);
        return peak;
    }

    async run(start_days_ago = 1, end_days_ago = 1) {
        const start_date = moment().subtract(start_days_ago, "days").startOf("day");
        const end_date = moment().subtract(end_days_ago, "days").endOf("day");
        let articles = await get_hits(start_date, end_date)
        for (let article of articles) {
            article.peak = await this.peak(article.hits);
        }
        articles = articles.sort((a, b) => {
            try {
                return b.peak.count - a.peak.count
            } catch (err) {
                console.log({ a, b });
            }
        });
        this.articles = articles;
        return this.articles;
    }
}

class ArticleTags {
    constructor(opts) {
        opts = Object.assign(opts || {}, {
            // Defaults here
        });
    }

    get_tags(articles) {
        let tags = new Set();
        for (let article of articles) {
            tags.add(...article.tags);
        }
        tags.delete(undefined);
        return tags;
    }

    async run(start_days_ago = 1, end_days_ago = 1) {
        const start_date = moment().subtract(start_days_ago, "days").startOf("day");
        const end_date = moment().subtract(end_days_ago, "days").endOf("day");
        let articles = await get_hits(start_date, end_date)
        let tags = this.get_tags(articles);
        let tag_count = {};
        for (let tag of tags) {
            if (!tag_count[tag]) tag_count[tag] = 0;
            tag_count[tag] = articles.filter(article => article.tags.includes(tag)).reduce((prev, cur) => {
                return prev += cur.hits.reduce((hit_prev, hit_cur) => hit_prev + hit_cur.count, 0)
            }, tag_count[tag]);
        }
        let tag_array = [];
        for (const [name, count] of Object.entries(tag_count)) {
            tag_array.push({ name, count });
        }
        tag_array = tag_array.sort((a, b) => b.count - a.count)
        return tag_array;
    }
}

class ArticleSections {
    constructor(opts) {
        opts = Object.assign(opts || {}, {
            // Defaults here
        });
    }

    get_sections(articles) {
        let sections = new Set();
        for (let article of articles) {
            sections.add(...article.sections);
        }
        sections.delete(undefined);
        return sections;
    }

    async run(start_days_ago = 1, end_days_ago = 1) {
        const start_date = moment().subtract(start_days_ago, "days").startOf("day");
        const end_date = moment().subtract(end_days_ago, "days").endOf("day");
        let articles = await get_hits(start_date, end_date)
        let sections = this.get_sections(articles);
        let section_count = {};
        for (let section of sections) {
            if (!section_count[section]) section_count[section] = 0;
            section_count[section] = articles.filter(article => article.sections.includes(section)).reduce((prev, cur) => {
                return prev += cur.hits.reduce((hit_prev, hit_cur) => hit_prev + hit_cur.count, 0)
            }, section_count[section]);
        }
        let section_array = [];
        for (const [name, count] of Object.entries(section_count)) {
            section_array.push({ name, count });
        }
        section_array = section_array.sort((a, b) => b.count - a.count)
        return section_array;
    }
}

class CompareFeatures {
    compare_position(features1, features2) {
        for(let feature1 of features1) {
            let feature2 = features2.find(feature => feature1.name === feature.name);
            if (!feature2) {
                feature1.compare_position = 0;
                continue;
            }
            feature1.compare_position = features2.findIndex(feature => feature1.name === feature.name) - features1.findIndex(feature => feature1.name === feature.name);
        }
        return features1;
    }
}

class ArticleLongTails {
    constructor(opts) {
        opts = Object.assign(opts || {}, {
            // Defaults here
        });
    }

    async run() {
        var month = new Date();
        month.setDate(month.getDate() - 30);
        const month_str = month.toISOString();
        var week = new Date();
        week.setDate(week.getDate() - 7);
        const week_str = week.toISOString();
        const result = await jxphelper.aggregate("article", [
            {
                $match: {
                    "hits.count": { $gte: 1000 }
                }
            },
            { 
                $match: { 
                    $expr: {
                        $and: [
                            { 
                                $lte: [
                                    "$date_published",
                                    { 
                                        $dateFromString: { 
                                            dateString: month_str 
                                        } 
                                    }
                                ] 
                            },
                        ]
                    }
                }
            },
            { $unwind: "$hits" },
            { $project: { _id: 1, urlid: 1, title: 1, author: 1, date_published: 1, hit_date: "$hits.date", hit_count: "$hits.count" } },
            {
                $addFields: {
                    hit_date: { $toDate: "$hit_date" }
                }
            },
            {
                $match: {
                    "hit_count": { $gte: 1000 }
                }
            },
            { 
                $match: {
                    $expr: {
                        $and: [
                            {
                                $gte: [
                                    "$hit_date",
                                    { 
                                        $dateFromString: { 
                                            dateString: week_str 
                                        } 
                                    }
                                ]
                            }
                        ]
                    }
                }
            },
        ]);
        let articles = result.data.sort((a, b) => {
            try {
                return b.hit_count - a.hit_count
            } catch (err) {
                console.log({ a, b });
            }
        });
        return articles;
    }
}

module.exports = { ArticleHits, ArticleTags, ArticleSections, CompareFeatures, ArticleLongTails };