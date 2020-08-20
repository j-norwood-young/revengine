/* global JXPSchema ObjectId Mixed */

const TouchbaseListSchema = new JXPSchema({
    name: { type: String, unique: true },
    list_id: { type: String, unique: true },
},
{
    perms: {
        admin: "crud",
    }
});

const TouchbaseList = JXPSchema.model('TouchbaseList', TouchbaseListSchema);
module.exports = TouchbaseList;