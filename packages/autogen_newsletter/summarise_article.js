const OpenAI = require("openai");
require("dotenv").config();
const apihelper = require("@revengine/common/apihelper");

const configuration = new OpenAI.Configuration({ apiKey: process.env.OPENAI_API_KEY});
const openai = new OpenAI.OpenAIApi(configuration);

function generateSummaryPrompt(body) {
    return `${body.replace(/(<([^>]+)>)/gi, "").slice(0,10000)}
    Summarize in 100 words:`
    ;
}

module.exports = async function summarise_article(article_id) {
    const article = (await apihelper.getOne("article", article_id)).data;
    if (article.summary) return article.summary;
    const prompt = generateSummaryPrompt(article.content);
    try {
        // console.log(prompt);
        const completion = await openai.createCompletion({
            model: "text-davinci-002",
            prompt: prompt,
            temperature: 0.6,
            max_tokens: 300,
            temperature: 0.70,
            top_p: 1,
            frequency_penalty: 0.5,
            presence_penalty: 0
        });
        await apihelper.put("article", article_id, {summary: completion.data.choices[0].text});
        return completion.data.choices[0].text.trim();
    } catch(err) {
        console.error(err.data ? JSON.stringify(err.data, null, 2) : err);
        console.log(prompt);
        return new Error(`Error summarising article ${article_id}`);
    }
    // return "";
}