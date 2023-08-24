// Generate a report of article performance for the last 7 days
const config = require("config");
const JXPHelper = require("jxp-helper");
require("dotenv").config();
const moment = require("moment-timezone");
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
moment.tz.setDefault(config.timezone || "UTC");

const get_hits = async (published_start_date, published_end_date) => {
    let params = {
        // "filter[date_published]": `$lte:${published_end_date.toISOString()}`,
        "filter[date_published]": `$gte:${published_start_date.toISOString()}`,
        "filter[hits]": "$exists:1"
    }
    const result = (await jxphelper.get("article", params)).data.filter(article => article.hits.length && article.date_published && moment(article.date_published).valueOf() < moment(published_end_date).valueOf());
    return result;
}

const get_unique_hits = async (published_start_date, published_end_date) => {
    let params = {
        // "filter[date_published]": `$lte:${published_end_date.toISOString()}`,
        "filter[date_published]": `$gte:${published_start_date.toISOString()}`,
        "filter[unique_hits]": "$exists:1",
        "fields": "title,urlid,post_id,type,unique_hits,date_published,author,sections,tags,img_thumbnail,avg_secs_engaged,engagement_rate,returning_readers"
    }
    const result = (await jxphelper.get("article", params)).data.filter(article => article.unique_hits.length && article.date_published && moment(article.date_published).valueOf() < moment(published_end_date).valueOf());
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

    async run(start_days_ago = 1, end_days_ago = 2) {
        const published_start_date = moment().subtract(start_days_ago, "days");
        const published_end_date = moment().subtract(end_days_ago, "days");
        let articles = await get_unique_hits(published_start_date, published_end_date)
        for (let article of articles) {
            article.peak = await this.peak(article.unique_hits);
        }
        articles = articles.sort((a, b) => {
            try {
                return b.peak.count - a.peak.count
            } catch (err) {
                console.error(err);
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
        const published_start_date = moment().subtract(start_days_ago, "days").startOf("day");
        const published_end_date = moment().subtract(end_days_ago, "days").endOf("day");
        let articles = await get_unique_hits(published_start_date, published_end_date)
        let tags = this.get_tags(articles);
        let tag_count = {};
        for (let tag of tags) {
            if (!tag_count[tag]) tag_count[tag] = 0;
            tag_count[tag] = articles.filter(article => article.tags.includes(tag)).reduce((prev, cur) => {
                return prev += cur.unique_hits.reduce((hit_prev, hit_cur) => hit_prev + hit_cur.count, 0)
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

    async run(start_days_ago = 3, end_days_ago = 2) {
        const published_start_date = moment().subtract(start_days_ago, "days").startOf("day");
        const published_end_date = moment().subtract(end_days_ago, "days").endOf("day");
        let articles = await get_unique_hits(published_start_date, published_end_date)
        let sections = this.get_sections(articles);
        let section_count = {};
        for (let section of sections) {
            if (!section_count[section]) section_count[section] = 0;
            section_count[section] = articles.filter(article => article.sections.includes(section)).reduce((prev, cur) => {
                return prev += cur.unique_hits.reduce((hit_prev, hit_cur) => hit_prev + hit_cur.count, 0)
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

    async run(section) {
        try {
            var month = new Date();
            month.setDate(month.getDate() - 30);
            const month_str = month.toISOString();
            var week = new Date();
            week.setDate(week.getDate() - 7);
            const week_str = week.toISOString();
            let filters = [
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
            ];
            if (section) filters.push({
                "$section": section
            });
            const result = await jxphelper.aggregate("article", [
                {
                    $match: {
                        "hits.count": { $gte: 1000 }
                    }
                },
                {
                    $match: { 
                        $expr: {
                            $and: filters
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
                    console.error(err);
                    console.log({ a, b });
                }
            });
            return articles;
        } catch(err) {
            return Promise.reject(err);
        }
    }
}

module.exports = { 
    ArticleHits, 
    ArticleTags, 
    ArticleSections, 
    CompareFeatures, 
    ArticleLongTails,
    TopLastHour: require("./libs/top_last_hour"),
    TopLastPeriod: require("./libs/top_last_period"),
    Hits24H: require("./libs/hits_24h"),
    Newsletter: require("./libs/newsletter"),
    NewsletterSubscribers: require("./libs/top_newsletter_subscribers"),
    Facets: require("./libs/facets"),
    RFV: require("./libs/rfv"),
    Random: require("./libs/random"),
    Sessions: require("./libs/sessions"),
};