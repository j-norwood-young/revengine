/* global JXPSchema */

const ArticleSchema = new JXPSchema({
    urlid: { type: String, index: true },
    author: String,
    date_published: Date,
    date_updated: Date,
    content: String,
    title: String,
    excerpt: String,
    type: String
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