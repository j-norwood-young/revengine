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
    img_full: String,
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