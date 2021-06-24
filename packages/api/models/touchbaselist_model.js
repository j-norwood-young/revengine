/* global JXPSchema ObjectId Mixed */

const TouchbaseListSchema = new JXPSchema({
    name: { type: String },
    list_id: { type: String, unique: true },
},
{
    perms: {
        admin: "crud",
    }
});

const TouchbaseList = JXPSchema.model('touchbaselist', TouchbaseListSchema);
module.exports = TouchbaseList;