import config from "config";
import dotenv from "dotenv";
dotenv.config();
const period = "week";
import axios from "axios";
import summarise_article from "./summarise_article.js";
// import { Configuration, OpenAIApi } from "openai";

async function find_top_articles(sections) {
    const url = `${config.wordpress.local_server}/top_articles/${period}?section=${sections[0]}`;
    console.log(url);
    const result = await axios.get(url);
    return result.data;
}

export default async function generate(sections) {
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

