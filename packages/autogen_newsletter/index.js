const config = require("config");
require("dotenv").config();
const apihelper = require("@revengine/common/apihelper");
const period = "week";
const axios = require("axios");
const summarise_article = require("./summarise_article");
// import { Configuration, OpenAIApi } from "openai";

async function find_top_articles(sections) {
    const url = `${config.wordpress.local_server}/top_articles/${period}?section=${sections[0]}`;
    console.log(url);
    const result = await axios.get(url);
    return result.data;
}

const generate = async (sections) => {
    try {
        const articles = await find_top_articles(sections);
        const summaries = [];
        for (let article of articles) {
            const summary = await summarise_article(article._id);
            summaries.push({
                article,
                summary,
        });
        }
        return summaries;
    } catch(err) {
        console.error(err.data ? JSON.stringify(err.data, null, 2) : err);
        return { error: err.toString() };
    }
}

module.exports = {
    generate
}

