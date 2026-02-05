import config from "config";
import JXPHelper from "jxp-helper";
import * as dotenv from "dotenv";
import {
    fetchContent,
    normalizeForWhitebeardContent,
    mapToArticlePayload,
    getTrackerArticleFields,
} from "@revengine/common/revengine_whitebeard";

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

    const save_to_db = !config.debug && process.env.NODE_ENV !== "test";

    const article = (
        await jxphelper.get("article", {
            "filter[post_id]": post_id,
            fields: "tags,sections,date_published,author,title,dm_key_theme,dm_article_theme,dm_user_need,dm_disable_comments",
        })
    ).data?.pop();

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
    }

    const wb = await fetchContent(post_id);
    if (!wb) return EMPTY_ARTICLE_FIELDS;

    const trackerFields = getTrackerArticleFields(wb);

    if (save_to_db) {
        try {
            const whitebeardPayload = normalizeForWhitebeardContent(wb);
            const wbSaved = (await jxphelper.post("whitebeardcontent", whitebeardPayload))?.data;
            const whitebeardContentId = wbSaved?._id ?? null;
            const articlePayload = mapToArticlePayload(wb, whitebeardContentId);
            if (articlePayload) {
                console.log("Saving article to database", articlePayload.title);
                await jxphelper.post("article", articlePayload);
            }
        } catch (err) {
            console.error("Failed to save Whitebeard content/article to JXP:", err);
        }
    }

    return trackerFields;
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