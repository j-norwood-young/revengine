/**
 * Library for fetching and normalising content from the Whitebeard CMS API.
 * Uses endpoint: GET /cms/content/{{ article_id }}
 * @see https://apidocsv3.whitebeard.net/ (v3.1)
 */

import config from "config";
import dotenv from "dotenv";
dotenv.config();

const WHITEBEARD_CONTENT_PATH = "/cms/content";
const WHITEBEARD_API_URL = process.env.WHITEBEARD_API_URL ?? config.whitebeard?.api ?? null;
const WHITEBEARD_API_KEY = process.env.WHITEBEARD_API_KEY ?? config.whitebeard?.apiKey ?? null;

if (!WHITEBEARD_API_URL || !WHITEBEARD_API_KEY) {
    console.warn("revengine_whitebeard: WHITEBEARD_API_URL or WHITEBEARD_API_KEY not set");
}

const headers = {
    "API-Key": `${WHITEBEARD_API_KEY}`,
    "Accept": "application/json",
};

/**
 * Fetch a single content item from the Whitebeard API.
 * @param {string|number} articleId - Whitebeard content id (same as post_id in our system)
 * @returns {Promise<Object|null>} - The API response object or null on failure/not found
 */
export async function fetchContent(articleId) {
    const url = `${WHITEBEARD_API_URL}${WHITEBEARD_CONTENT_PATH}/${encodeURIComponent(String(articleId))}`;
    try {
        const res = await fetch(url, {
            headers,
        });
        if (!res.ok) {
            if (res.status === 404) return null;
            throw new Error(`Whitebeard API ${res.status}: ${res.statusText}`);
        }
        return await res.json();
    } catch (err) {
        console.error("revengine_whitebeard fetchContent:", err.message);
        return null;
    }
}

/**
 * Parse Whitebeard date strings (e.g. "2025-11-06 11:56:44") to ISO string for JXP/Mongo.
 * @param {string|null|undefined} value
 * @returns {string|undefined}
 */
function parseWhitebeardDate(value) {
    if (value == null || value === "") return undefined;
    const s = String(value).trim();
    if (!s) return undefined;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/**
 * Normalise the Whitebeard API response for saving to the whitebeardcontent JXP collection.
 * Converts date strings to ISO and keeps structure compatible with WhitebeardContentSchema.
 * @param {Object} wb - Raw Whitebeard API response
 * @returns {Object} - Payload suitable for jxphelper.post("whitebeardcontent", payload)
 */
export function normalizeForWhitebeardContent(wb) {
    if (!wb || !wb.id) return wb;
    const firstPublished = parseWhitebeardDate(wb.firstPublished);
    const lastUpdate = parseWhitebeardDate(wb.lastUpdate);
    return {
        ...wb,
        firstPublished: firstPublished ?? wb.firstPublished,
        lastUpdate: lastUpdate ?? wb.lastUpdate,
    };
}

/**
 * Map Whitebeard API response to our Article JXP model payload.
 * Matches project convention: terms from keywords + dm-key-theme, dm-article-theme, dm-user-need; sorted arrays; first attachment for images.
 * @param {Object} wb - Raw Whitebeard API response (data)
 * @param {string} [whitebeardContentId] - _id of the saved whitebeardcontent document (ObjectId string)
 * @returns {Object} - Payload for jxphelper.post("article", payload)
 */
export function mapToArticlePayload(wb, whitebeardContentId) {
    if (!wb || wb.id == null) return null;

    const terms = [
        ...(wb.keywords || []).map((k) => k?.data?.name).filter(Boolean),
        ...(wb["dm-key-theme"] || []),
        ...(wb["dm-article-theme"] || []),
        ...(wb["dm-user-need"] || []),
    ]
        .filter((d) => typeof d === "string")
        .map((d) => d.trim())
        .filter(Boolean)
        .sort();

    const categories = Array.isArray(wb.categories) ? wb.categories : [];
    const sections = categories.map((c) => c?.name).filter(Boolean).sort();
    const tags = (wb.keywords || []).map((k) => k?.data?.name).filter(Boolean).sort();
    const author = (wb.authors || []).map((a) => a?.name).filter(Boolean).sort().join(", ");
    const firstAttachment = wb.attachments?.[0];

    const toStrArray = (v) => (Array.isArray(v) ? v : v != null ? [v] : []).map((d) => String(d).trim()).filter(Boolean);

    const article_data = {
        post_id: parseInt(String(wb.id), 10),
        urlid: wb.slug ?? "",
        author,
        date_published: new Date(wb.firstPublished).toISOString(),
        date_modified: new Date(wb.lastUpdate).toISOString(),
        content: wb.contents ?? "",
        title: wb.title ?? "",
        excerpt: wb.description ?? "",
        type: (wb.objectType || "article").toLocaleLowerCase(),
        terms,
        tags,
        sections,
        primary_section: categories[0]?.name ?? "",
        custom_section_label: wb.dm_custom_section_label ?? "",
        img_thumbnail: firstAttachment?.url_thumbnail ?? "",
        img_medium: firstAttachment?.url_medium ?? "",
        img_full: firstAttachment?.url_large ?? "",
        status: wb.status ?? "publish",
        dm_key_theme: toStrArray(wb["dm-key-theme"]),
        dm_article_theme: toStrArray(wb["dm-article-theme"]),
        dm_user_need: toStrArray(wb["dm-user-need"]),
        dm_disable_comments: Boolean(wb["dm-disable-comments"]),
    };
    if (whitebeardContentId) {
        article_data.whitebeardcontent_id = whitebeardContentId;
    }
    return article_data;
}

/**
 * Extract tracker-facing article fields from a Whitebeard API response.
 * Used to return { sections, tags, date_published, author_id, title, dm_key_theme, dm_article_theme, dm_user_need, dm_disable_comments } for the event tracker.
 * Uses same conventions as mapToArticlePayload (sorted sections/tags, author comma-separated).
 * @param {Object} wb - Raw Whitebeard API response
 * @returns {Object} - Tracker article fields including dm_* for Elasticsearch
 */
export function getTrackerArticleFields(wb) {
    const emptyArrays = () => ({ sections: null, tags: null, date_published: null, author_id: null, title: null, dm_key_theme: null, dm_article_theme: null, dm_user_need: null, dm_disable_comments: null });
    if (!wb || wb.id == null) return emptyArrays();

    const toStrArray = (v) => (Array.isArray(v) ? v : v != null ? [v] : []).map((d) => String(d).trim()).filter(Boolean);
    const categories = Array.isArray(wb.categories) ? wb.categories : [];
    const sections = categories.map((c) => c?.name).filter(Boolean).sort();
    const tags = (wb.keywords || []).map((k) => k?.data?.name).filter(Boolean).sort();
    const author_id = (wb.authors || []).map((a) => a?.name).filter(Boolean).sort().join(", ") || null;
    const date_published = wb.firstPublished ? new Date(wb.firstPublished).toISOString() : null;
    const dm_key_theme = toStrArray(wb["dm-key-theme"]);
    const dm_article_theme = toStrArray(wb["dm-article-theme"]);
    const dm_user_need = toStrArray(wb["dm-user-need"]);
    const dm_disable_comments = Boolean(wb["dm-disable-comments"]);

    return {
        sections: sections.length ? sections : null,
        tags: tags.length ? tags : null,
        date_published,
        author_id: author_id || null,
        title: wb.title ?? null,
        dm_key_theme: dm_key_theme.length ? dm_key_theme : null,
        dm_article_theme: dm_article_theme.length ? dm_article_theme : null,
        dm_user_need: dm_user_need.length ? dm_user_need : null,
        dm_disable_comments,
    };
}
