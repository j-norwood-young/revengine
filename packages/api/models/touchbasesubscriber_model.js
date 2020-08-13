/* global JXPSchema ObjectId Mixed */
// const shared = require("../libs/shared");

const TouchbaseSubscriberSchema = new JXPSchema({
    name: String,
    list_id: { type: ObjectId, link: "TouchbaseList" },
    email: String,
    date: Date,
    state: String,
    data: Mixed,
    email_client: String,
    uid: { type: String, unique: true }, //md5 of list_id + email
},
{
    perms: {
        admin: "crud",
        owner: "crud",
        user: "",
        all: ""
    }
});

// TouchbaseSubscriberSchema.post("save", shared.datasource_post_save);

const TouchbaseSubscriber = JXPSchema.model('TouchbaseSubscriber', TouchbaseSubscriberSchema);
module.exports = TouchbaseSubscriber;
