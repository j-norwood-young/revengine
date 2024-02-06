import config from "config";
import JXPHelper from "jxp-helper";
import dotenv from "dotenv";
import { get_post } from "@revengine/common/revengine_wordpress"
dotenv.config();
const jxphelper = new JXPHelper({
    server: config.api.server,
    apikey: process.env.APIKEY,
});

export const get_article_data = async function (post_id) {
    const save_to_db = !config.debug;
    let sections = null;
    let tags = null;
    let date_published = null;
    let author_id = null;
    let title = null;
    if (post_id) {
        const article = (
            await jxphelper.get("article", {
                "filter[post_id]": post_id,
                fields: "tags,sections,date_published,author",
            })
        ).data.pop();
        if (!article) {
            const wpdata = await get_post(post_id);
            if (wpdata === null) return {};
            if (wpdata?.data && wpdata.data.post_id === post_id) {
                const wparticle = wpdata.data;
                tags = wparticle.tags;
                sections = wparticle.sections;
                date_published = wparticle.date_published;
                author_id = wparticle.author;
                title = wparticle.title;
            }
            if (save_to_db) {
                await jxphelper.post("article", wpdata.data);
            }
        } else {
            tags = article.tags;
            sections = article.sections;
            date_published = article.date_published;
            author_id = article.author;
            title = article.title;
        }
    }
    return { sections, tags, date_published, author_id, title };
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