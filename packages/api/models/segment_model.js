const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;

const SegmentSchema = new Schema({
    name: String,
    _owner_id: ObjectId
},
{
    toObject: {
        virtuals: true
    },
    toJSON: {
        virtuals: true
    },
    timestamps: true,
    writeConcern: {
        w: 'majority',
        j: true,
        wtimeout: 1000
    },
});

// We can set permissions for different user types and user groups
SegmentSchema.set("_perms", {
    admin: "crud", // CRUD = Create, Retrieve, Update and Delete
    owner: "crud",
    user: "r",
});

module.exports = mongoose.model('Segment', SegmentSchema);
