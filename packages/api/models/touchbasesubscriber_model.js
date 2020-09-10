/* global JXPSchema ObjectId Mixed */
// const shared = require("../libs/shared");

const TouchbaseSubscriberSchema = new JXPSchema({
    name: String,
    list_id: { type: ObjectId, link: "touchbaselist" },
    email: { type: String, index: true },
    date: Date,
    state: { type: String, index: true },
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
