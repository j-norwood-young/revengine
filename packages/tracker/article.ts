import config from "config";
import JXPHelper from "jxp-helper";
import * as dotenv from "dotenv";

dotenv.config();
const jxphelper = new JXPHelper({
    server: process.env.API_SERVER || config.api.server,
    apikey: process.env.APIKEY,
});

const IGNORE_POST_IDS = [
    "0", // Home
    "29",
    "30",
    "1855",
    "387188",
    "119012",
    "150"
];

const EMPTY_ARTICLE_FIELDS = {
    sections: null,
    tags: null,
    date_published: null,
    author_id: null,
    title: null,
    dm_key_theme: null,
    dm_article_theme: null,
    dm_user_need: null,
    dm_disable_comments: null,
};

export const get_article_data = async function (post_id: string | number) {
    if (!post_id || IGNORE_POST_IDS.includes(String(post_id))) return EMPTY_ARTICLE_FIELDS;

    let article: any = null;
    try {
        const res = await jxphelper.get("article", {
            "filter[post_id]": post_id,
            fields: "tags,sections,date_published,author,title,dm_key_theme,dm_article_theme,dm_user_need,dm_disable_comments",
        });
        article = res?.data?.pop();
    } catch (err: any) {
        const msg = err?.response?.data ?? err?.message ?? String(err);
        console.warn("get_article_data: JXP/API unreachable or error, falling back to Whitebeard:", msg);
    }

    if (article) {
        return {
            sections: article.sections ?? null,
            tags: article.tags ?? null,
            date_published: article.date_published ?? null,
            author_id: article.author ?? null,
            title: article.title ?? null,
            dm_key_theme: article.dm_key_theme ?? null,
            dm_article_theme: article.dm_article_theme ?? null,
            dm_user_need: article.dm_user_need ?? null,
            dm_disable_comments: article.dm_disable_comments ?? null,
        };
    } else {
        console.log("No article found for post_id:", post_id);
        return EMPTY_ARTICLE_FIELDS;
    }
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