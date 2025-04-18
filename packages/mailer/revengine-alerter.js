const config = require("config");
const fetch = require("node-fetch");
const JXPHelper = require("jxp-helper");
const moment = require("moment-timezone");
const Reports = require("@revengine/reports");
const program = require('commander');

const jxphelper = new JXPHelper({ server: process.env.API_SERVER || config.api.server, apikey: process.env.APIKEY });
require("dotenv").config();

moment.tz.setDefault(config.timezone || "UTC");

program
    .option('-v, --verbose', 'verbose debugging')
    .option('-d, --dev', `push to stdout`)
    ;

program.parse(process.argv);

const main = async () => {
    try {
        if (program.verbose) console.log(`Fetching ${config.wordpress.server}/wp-json/revengine/v1/featured`);
        const result = await fetch(`${config.wordpress.server}/wp-json/revengine/v1/featured`, {
            method: 'get',
            headers: {
                'Authorization': `Bearer ${process.env.WORDPRESS_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        const json_result = await result.json();
        const articles = json_result.data;
        const report = new Reports.TopLastHour();
        const top_articles = await report.run();
        // if (program.verbose) console.log({ top_articles, articles });
        const underperforming = [];
        const overperforming = [];
        for (let article of articles.filter(article => moment(article.date_published).isBefore(moment().subtract(1, 'hours')))) {
            let match = top_articles.find(comp => article.post_id === comp.key);
            if (!match) {
                const article_hit = await report.run({ article_id: article.post_id });
                article.hits = (article_hit[0]) ? article_hit[0].doc_count : 0;
                if (article.position < 10 && article.hits > 0) { // Limit underperforming to top 10 articles with hits
                    underperforming.push(article);
                    if (program.verbose) console.log("Underperforming", article);
                }
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
        if (!overperforming.length && !underperforming.length) {
            if (program.verbose) console.log("No overperforming or underperforming articles. Good job!");
            return;
        }
        const blocks = [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `:100: *RevEngine Front Page Performance Update, ${moment().format("ddd D MMM HH:mm")}*`
                }
            }
        ];
        if (overperforming.length) {
            blocks.push(
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `:arrow_up: *Overperforming (hits last hour), consider promoting on home page*`
                    }
                }
            );

            for (let article of overperforming) {
                blocks.push({
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `<${config.wordpress.homepage}/${article.type}/${article.urlid}|${article.title}> (${article.hits.toLocaleString()})\n_Published ${moment(article.date_published).format("YYYY-MM-DD HH:mm")} | ${article.author} | ${article.sections.join(", ")}_\n<https://www.dailymaverick.co.za/wp-admin/admin.php?page=featured-flagged-post&post=${article.post_id}|Move to #10>`
                    }
                })
            }
        }
        if (underperforming.length) {
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
                        text: `<${config.wordpress.homepage}/${article.type}/${article.urlid}|${article.title}> (#${article.position} / ${article.hits.toLocaleString()})\n_Published ${moment(article.date_published).format("YYYY-MM-DD HH:mm")}  | ${article.author} | ${article.sections.join(", ")}_`
                    }
                })
            }
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
    } catch (err) {
        return Promise.reject(err);
    }
}


main().catch(console.error);