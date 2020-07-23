/* global JXPSchema */

const ArticleSchema = new JXPSchema({
    post_id: Number,
    urlid: { type: String, index: true },
    author: String,
    date_published: Date,
    date_modified: Date,
    content: String,
    title: String,
    excerpt: String,
    type: String,
    tags: [ String ],
    sections: [ String ],
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