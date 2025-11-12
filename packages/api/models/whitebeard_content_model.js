/* global JXPSchema */

const WhitebeardContentSchema = new JXPSchema({
    objectType: { type: String, index: true },
    id: { type: String, index: true, unique: true },
    signature: { type: String, index: true },
    url: { type: String, index: true },
    shorturl: String,
    slug: { type: String, index: true },
    contentType: {
        id: String,
        name: String,
        slug: String,
        editor: String
    },
    views: Number,
    comments: Number,
    preview_limit: Number,
    rating: Number,
    excludedFromGoogleSearchEngine: Number,
    status: { type: String, index: true },
    title: { type: String, index: true },
    firstPublished: { type: Date, index: true },
    lastUpdate: { type: Date, index: true },
    categories: [Mixed],
    access_groups: [String],
    access_control: Boolean,
    counted_in_paywall: Boolean,
    content_length: Number,
    contents: String,
    teaser: String,
    externalUrl: String,
    sponsor: Mixed,
    authors: [Mixed],
    description: String,
    keywords: [Mixed],
    short_summary: String,
    source: Mixed,
    related: [Mixed],
    options: [Mixed],
    attachments: [Mixed],
    inline_attachments: [Mixed],
    summary: String,
    introduction: String,
    template_type: String,
    dm_custom_section_label: String,
    "dm-key-theme": [String],
    "dm-article-theme": [String],
    "dm-user-need": [String],
    "dm-disable-comments": Boolean,
    elements: [Mixed],
    seo: {
        search_title: String,
        search_description: String,
        social_title: String,
        social_description: String,
        social_image: String
    },
    time_to_read: Number,
    cached: Boolean
},
    {
        perms: {
            admin: "crud",
            owner: "crud",
            user: "r",
            all: ""
        }
    });

WhitebeardContentSchema.index({ "dm-key-theme": 1 });
WhitebeardContentSchema.index({ "dm-article-theme": 1 });
WhitebeardContentSchema.index({ categories: 1 });
WhitebeardContentSchema.index({ keywords: 1 });

const WhitebeardContent = JXPSchema.model('WhitebeardContent', WhitebeardContentSchema);
module.exports = WhitebeardContent;

