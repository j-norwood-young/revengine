const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Mixed = mongoose.Schema.Types.Mixed;
const shared = require("../libs/shared");

const WordpressUserSchema = new Schema({
    id: Number,
    email: String,
    first_name: String,
    last_name: String,
    name: String,
    date_created: Date,
    description: String,
    url: String,
    link: String,
    slug: String,
    roles: [ String ],
    avatar_urls: Mixed,
    meta: Mixed,
});

// We can set permissions for different user types and user groups
WordpressUserSchema.set("_perms", {
    admin: "crud",
});

WordpressUserSchema.post("save", function (doc) {
    shared.datasource_post_save("wordpressuser", doc);
});

module.exports = mongoose.model('WordpressUser', WordpressUserSchema);