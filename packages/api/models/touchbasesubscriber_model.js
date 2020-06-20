const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Mixed = mongoose.Schema.Types.Mixed;
const TouchbaseList = require("./touchbaselist_model");
const shared = require("../libs/shared");

const TouchbaseSubscriberSchema = new Schema({
    name: String,
    list_id: { type: ObjectId, ref: "TouchbaseList" },
    email: String,
    date: Date,
    state: String,
    data: Mixed,
    email_client: String,
    uid: String, //md5 of list_id + email
});

// We can set permissions for different user types and user groups
TouchbaseSubscriberSchema.set("_perms", {
    admin: "crud",
});

TouchbaseSubscriberSchema.post("save", shared.datasource_post_save);

module.exports = mongoose.model('TouchbaseSubscriber', TouchbaseSubscriberSchema);
