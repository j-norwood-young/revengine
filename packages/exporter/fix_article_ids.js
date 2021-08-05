const mysql = require("mysql");
const config = require("config");
const JXPHelper = require("jxp-helper");
const apihelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
require("dotenv").config();

const connection = mysql.createPool({
    host: config.mysql.host || "localhost",
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: config.mysql.database || "revengine"
});

const query = (connection, query) => {
    return new Promise((resolve, reject) => {
        try {
            connection.query(query, (err, result) => {
                if (err) return reject(err);
                return resolve(result);
            })
        } catch(err) {
            console.error(err);
            return reject(err);
        }
    })
}

const test_urls = [
    "https://www.dailymaverick.co.za/article/2013-05-27-the-grand-paradox-of-cannes/",
    "https://www.dailymaverick.co.za/article/2015-03-30-pieter-dirk-uys-and-mzilikazi-khumalo-and-the-many-uses-of-history/",
    "https://www.dailymaverick.co.za/article/2015-12-11-ole-blue-eyes-frank-sinatra-at-100/?blah"
]
const main = async () => {
    try {
        console.time("fix_article_id");
        const articles = await query(connection, "SELECT uid, slug FROM articles ORDER BY slug");
        const missing_urls = await query(connection, `SELECT url FROM touchbase_events WHERE article_uid IS NULL AND url LIKE "https://www.dailymaverick.co.za/article/%" GROUP BY url`);
        for (let missing_url of missing_urls) {
            try {
                let slug_parts = missing_url.url.match(/https:\/\/www\.dailymaverick\.co\.za\/article\/\d\d\d\d\-\d\d\-\d\d\-(.*?\/)/);
                if (!slug_parts) slug_parts = missing_url.url.match(/https:\/\/www\.dailymaverick\.co\.za\/article\/\d\d\d\d\-\d\d\-\d\d\-(.*?)/);
                let slug = slug_parts[1];
                if (slug.substr(-1) === "/") slug = slug.slice(0, -1);
                console.time(slug);
                const article = articles.find(article => article.slug === slug);
                if (!article) {
                    console.log(`Missing article: ${slug}`);
                    continue;
                }
                await query(connection, `UPDATE touchbase_events SET article_uid="${article.uid}" WHERE url = ${connection.escape(missing_url.url)} AND article_uid IS NULL`);
                console.timeEnd(slug);
            } catch(err) {
                console.error(err);
                console.log(missing_url);
            }
        }
        console.timeEnd("fix_article_id");
        // console.log(articles.slice(0, 10));
        process.exit(0);
        // return;
        for (let article of articles) {
            await query(`UPDATE touchbase_events SET article_uid="${article.uid}" WHERE article_uid IS NULL AND url LIKE "https://www.dailymaverick.co.za/article/${article.slug}%"`);
        }
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}

main();