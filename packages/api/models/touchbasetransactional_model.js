/* global JXPSchema ObjectId Mixed */
// const shared = require("../libs/shared");

const TouchbaseTransactionalSchema = new JXPSchema({
    name: String,
    touchbase_transactional_id: String,
    data_fn: Mixed,
    bcc: String,
},
{
    perms: {
        admin: "crud",
        owner: "crud",
        user: "",
        all: ""
    }
});

// TouchbaseTransactionalSchema.post("save", shared.datasource_post_save);

const TouchbaseTransactional = JXPSchema.model('touchbasetransactional', TouchbaseTransactionalSchema);
module.exports = TouchbaseTransactional;
