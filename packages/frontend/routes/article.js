const express = require('express');
const router = express.Router();
const config = require("config");
const nlp = require("@revengine/frontend/libs/nlp");
const Article_ml = require("@revengine/article_ml");

router.use("/", (req, res, next) => {
    res.locals.pg = "article";
    res.locals.title = "Articles";
    next();
})

const convert_sentiment = sentiment_score => {
    if (sentiment_score < -0.9) return "very negative";
    if (sentiment_score < -0.75) return "mostly negative";
    if (sentiment_score < -0.5) return "negative";
    if (sentiment_score < -0.25) return "somewhat negative";
    if (sentiment_score < -0) return "slightly negative";
    if (sentiment_score < 0.25) return "slightly positive";
    if (sentiment_score < 0.5) return "somewhat positive";
    if (sentiment_score < 0.75) return "positive";
    if (sentiment_score < 0.9) return "mostly positive";
    return "overwhelmingly positive";
}

router.get("/view/:article_id", async(req, res) => {
    try {
        const article = (await req.apihelper.getOne("article", req.params.article_id)).data;
        const sentiment = nlp.sentiment(article.content);
        const article_ml = await Article_ml.analyseArticle(article._id);
        // console.log(article_ml);
        res.render("article/view", { article, homepage: config.wordpress.homepage, sentiment, article_ml, convert_sentiment });
    } catch(err) {
        console.error(err);
        res.send(err);
    }
})

router.get("/hits/:article_id", async(req, res) => {
    try {
        const article = (await req.apihelper.getOne("article", req.params.article_id)).data;
        // console.log(article);
        res.send(article.hits.filter(day => (day.count)));
    } catch(err) {
        console.error(err);
        res.send(err);
    }
})

module.exports = router;