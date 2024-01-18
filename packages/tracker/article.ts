import config from "config";
import JXPHelper from "jxp-helper";
import dotenv from "dotenv";
dotenv.config();
const jxphelper = new JXPHelper({
    server: config.api.server,
    apikey: process.env.APIKEY,
});

export const get_article_data = async function (post_id) {
    let sections = null;
    let tags = null;
    let date_published = null;
    let author_id = null;
    if (post_id) {
        const article = (
            await jxphelper.get("article", {
                "filter[post_id]": post_id,
                fields: "tags,sections,date_published,author",
            })
        ).data.pop();
        if (article) {
            tags = article.tags;
            sections = article.sections;
            date_published = article.date_published;
            author_id = article.author;
        }
    }
    return { sections, tags, date_published, author_id };
}

export const get_article_data_test = async function () {
    const post_id = 674329;
    const expected = {
        sections: ["COVID-19", "Newsdeck", "South Africa"],
        tags: [ "Mineral Resources and Energy Minister Gwede Mantashe"],
        date_published: "2020-07-21T11:35:11.000Z",
        author_id: "News24",
    };
    const actual = await get_article_data(post_id);
    console.log(actual);
    console.assert(JSON.stringify(actual) === JSON.stringify(expected));
}

// get_article_data_test();