const config = require("config")
const fs = require("fs")
const JXPHelper = require("jxp-helper")
const program = require("commander")
require("dotenv").config();
const apihelper = new JXPHelper({ server: process.env.API_SERVER || config.api.server, apikey: process.env.APIKEY });
const mkdirp = require("mkdirp");
const path = require("path");
const Language = require('@google-cloud/language');
const language = new Language.LanguageServiceClient(config.google_cloud_language);

program
    .version(require('./package.json').version)
    .usage('[options] [dir]')
    .option(`-e, --export <dir>`, 'Export articles to directory')
    .option(`-l, --limit <number>`, 'Limit number of articles')
    .option(`-a, --analyse <string>`, `Analyse article located by urlid`)
    .option(`-f, --force`, `Force hit on Google Analytics, else serve cached result`)
    .option('-v, --version', 'JXP version')
    .parse(process.argv);

const options = program.opts();

const main = async () => {
    if (options.export) {
        await exportAllArticles(options.export);
    }
    if (options.analyse) {
        const article = (await apihelper.get("article", { "filter[urlid]": options.analyse, "fields": "_id" })).data.pop();
        if (!article) throw "Article not found";
        await analyseArticle(article._id, options.force)
    }
}

const cleanText = s => {
    s = s.replace(/(<([^>]+)>)/gi, ""); // Strip tags
    s = s.replace(/(\[([^>]+)\])/gi, ""); // Strip []
    return s;
}

const articleToText = article => `${article.title}\n\n${article.excerpt}\n\n${cleanText(article.content)}`;

const exportAllArticles = async (dir) => {
    try {
        await mkdirp(dir);
        const opts = {};
        if (options.limit) {
            opts.limit = options.limit;
        }
        const articles = (await apihelper.get("article", opts)).data;
        for (let article of articles) {
            if (!article.content) continue;
            console.log(article.title);
            const fname = path.join(dir, article.urlid + ".txt");
            fs.writeFileSync(fname, articleToText(article))
        }
    } catch (err) {
        console.error(err);
    }
}

const analyseArticle = async (_id, force) => {
    try {
        const article = (await apihelper.getOne("article", _id)).data;
        if (!article) throw "Article not found";
        const document = {
            content: articleToText(article),
            type: 'PLAIN_TEXT',
        };
        // Categories
        let categories = null;
        if (article.google_categories.length && !force) {
            categories = article.google_categories;
        } else {
            const [classification] = await language.classifyText({ document });
            categories = classification.categories;
            await apihelper.put("article", article._id, { google_categories: categories })
        }
        // Entities
        let entities = null;
        if (article.google_entities.length && !force) {
            entities = article.google_entities;
        } else {
            const [result] = await language.analyzeEntitySentiment({ document, encodingType: 'UTF8' });
            entities = result.entities;
            await apihelper.put("article", article._id, { google_entities: entities })
        }
        // Sentiment
        let sentiment = null;
        if (article.google_sentiment && !force) {
            sentiment = article.google_sentiment;
        } else {
            const [result] = await language.analyzeSentiment({ document, encodingType: 'UTF8' });
            sentiment = result;
            // console.log(JSON.stringify(sentiment, null, "   "));
            await apihelper.put("article", article._id, { google_sentiment: sentiment })
        }
        console.log(sentiment.documentSentiment)
        console.log(categories);
        console.log(entities.slice(0, 3));
        return { categories, entities, sentiment };
    } catch (err) {
        console.error(err);
    }
}

main()

module.exports = { analyseArticle };