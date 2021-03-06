/* global JXPSchema */

const ArticleSchema = new JXPSchema({
    post_id: { type: Number, index: true },
    urlid: { type: String, index: true },
    author: { type: String, index: true },
    date_published: { type: Date, index: true },
    date_modified: { type: Date, index: true },
    content: String,
    title: String,
    excerpt: String,
    type: String,
    tags: [ String ],
    sections: [ String ],
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
    hits: [ Mixed ],
},
{
    perms: {
        admin: "crud",
        owner: "crud",
        user: "cr",
        all: ""
    }
});

const Article = JXPSchema.model('Article', ArticleSchema);
module.exports = Article;