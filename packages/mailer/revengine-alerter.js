const config = require("config");
require("dotenv").config();
const path = require("path");
const http = require("http");
const fetch = require("node-fetch");
const JXPHelper = require("jxp-helper");
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const moment = require("moment-timezone");
const Reports = require("@revengine/reports");
const numberFormat = new Intl.NumberFormat(config.locale || "en-GB");
const program = require('commander');

moment.tz.setDefault(config.timezone || "UTC");

program
    .option('-v, --verbose', 'verbose debugging')
    .option('-d, --dev', `push to stdout`)
    ;

program.parse(process.argv);

const main = async () => {
    try {
        const result = await fetch(`${config.wordpress.server}/wp-json/revengine/v1/featured`, {
            method: 'get',
            headers: {
                'Authorization': `Bearer ${process.env.WORDPRESS_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        const json_result = await result.json();
        const articles = json_result.data.filter(article => moment(article.date_published).isBefore(moment().subtract(1, 'hours')));
        const report = new Reports.TopLastHour();
        const top_articles = await report.run();
        // if (program.verbose) console.log({ top_articles, articles });
        const underperforming = [];
        const overperforming = [];
        for (let article of articles) {
            let match = top_articles.find(comp => article.post_id === comp.key);
            if (!match) {
                const article_hit = await report.run({ article_id: article.post_id });
                article.hits = (article_hit[0]) ? article_hit[0].doc_count : 0;
                if (article.position < 10) underperforming.push(article); // Limit underperforming to top 10 articles
                if (program.verbose) console.log("Underperforming", article);
            }
        }
        for (let article of top_articles.slice(0, 10)) {
            let match = articles.find(comp => article.key === comp.post_id);
            if (!match) {
                const full_article_search = await jxphelper.get("article", { "filter[post_id]": article.key });
                if (!full_article_search.count) continue;
                let full_article = full_article_search.data[0];
                full_article.hits = article.doc_count;
                overperforming.push(full_article);
                if (program.verbose) console.log("Overperforming", full_article);
            }
        }
        const blocks = [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `:100: *RevEngine Front Page Performance Update, ${moment().format("ddd D MMM HH:mm")}*`
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `:arrow_up: *Overperforming (hits last hour), consider promoting on home page*`
                }
            }
        ]
        
        for (let article of overperforming) {
            blocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `<${config.wordpress.homepage}/${article.urlid}|${article.title}> (${article.hits.toLocaleString()})\n_Published ${moment(article.date_published).format("YYYY-MM-DD HH:mm")} | ${article.author} | ${article.sections.join(", ")}_`
                }
            })
        }

        blocks.push({

            type: "section",
            text: {
                type: "mrkdwn",
                text: `:arrow_down: *Underperforming (page rank / hits), consider removing from home page or promoting*`
            }
        });

        for (let article of underperforming) {
            blocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `<${config.wordpress.homepage}/${article.urlid}|${article.title}> (#${article.position} / ${article.hits.toLocaleString()})\n_Published ${moment(article.date_published).format("YYYY-MM-DD HH:mm")}  | ${article.author} | ${article.sections.join(", ")}_`
                }
            })
        }

        blocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: `:arrows_clockwise: <${config.wordpress.front_page_admin}|Edit Front Page>`
            }
        })
        if (program.dev) {
            console.log(blocks);
        } else {
            await fetch(process.env.SLACK_WEBHOOK, 
                {
                    method: "post",
                    body: JSON.stringify({ blocks }),
                    headers: { 'Content-Type': 'application/json' }
                }
            )
        }
    } catch(err) {
        return Promise.reject(err);
    }
}


main().catch(console.error);