/* global JXPSchema */

const ArticleSchema = new JXPSchema({
    post_id: { type: Number, index: true, unique: true },
    urlid: { type: String, index: true },
    author: { type: String, index: true },
    date_published: { type: Date, index: true },
    date_modified: { type: Date, index: true },
    content: String,
    title: String,
    excerpt: String,
    type: String,
    tags: [ String ],
    terms: [ String ],
    sections: [ String ],
    custom_section_label: String,
    img_thumbnail: String,
    img_medium: String,
    img_full: String,
    google_categories: [
        { 
            name: String,
            confidence: Number
        }
    ],
    // google_entities: [
    //     {
    //         name: String,
    //         type: String,
    //         salience: Number,
    //         metadata: Mixed,
    //         mentions: [
    //             {
    //                 text: {
    //                     content: String,
    //                     beginOffset: Number
    //                 },
    //                 type: String,
    //                 sentiment: {
    //                     magnitude: Number,
    //                     score: Number
    //                  }
    //             }
    //         ]
    //     }
    // ],
    google_entities: [Mixed],
    google_sentiment: {
        sentences: [Mixed],
        documentSentiment: {
            magnitude: Number,
            score: Number
        },
        language: String
    },
    avg_secs_engaged: Number,
    engagement_rate: Number,
    returning_readers: Number,
    hits: [ Mixed ],
    unique_hits: [ Mixed ],
    newsletter_hits: [ Mixed ],
    logged_in_hits: [ Mixed ],
    subscriber_hits: [ Mixed ],
    readers_led_to_subscription: [ Mixed ],
    summary: String,
},
{
    perms: {
        admin: "crud",
        owner: "crud",
        user: "cr",
        all: ""
    }
});

ArticleSchema.index({ terms: 1 });
ArticleSchema.index({ tags: 1 });

const Article = JXPSchema.model('Article', ArticleSchema);
module.exports = Article;