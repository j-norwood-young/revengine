/* global JXPSchema */

const DeviceSchema = new JXPSchema({
    reader_id: { type: ObjectId, link: "reader", index: true },
    wordpress_id: { type: ObjectId, link: "wordpressuser", index: true },
    browser: String,
    browser_version: String,
    os: String,
    os_version: String,
    platform: String,
    user_agent: String,
    count: Number
},
{
    perms: {
        admin: "crud",
        owner: "crud",
        user: "cr",
        all: ""
    }
});

const Device = JXPSchema.model('Device', DeviceSchema);
module.exports = Device;