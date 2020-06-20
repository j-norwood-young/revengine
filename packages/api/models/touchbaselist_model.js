const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

const TouchbaseListSchema = new Schema({
    name: { type: String, unique: true },
    list_id: String,
});

// We can set permissions for different user types and user groups
TouchbaseListSchema.set("_perms", {
    admin: "crud",
});

module.exports = mongoose.model('TouchbaseList', TouchbaseListSchema);
