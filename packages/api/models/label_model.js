const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Mixed = mongoose.Schema.Types.Mixed;

const LabelSchema = new Schema({
    name: { type: String, unique: true },
    rules: {
        type: [String], 
        validate: {
            validator: function (v) {
                try {
                    JSON.parse(v);
                    return true;
                } catch(err) {
                    console.log({ v });
                    return false;
                }
            },
            message: props => `Rule is not valid JSON`
        }
    },
    _owner_id: ObjectId
});

// We can set permissions for different user types and user groups
LabelSchema.set("_perms", {
    admin: "crud", // CRUD = Create, Retrieve, Update and Delete
    owner: "crud",
    user: "r",
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

const applyLabel = async function (label) {
    const Reader = require("./reader_model");
    try {
        let query = [];
        for (let rule of label.rules) {
            query = JSON.parse(rule);
        }
        await Reader.updateMany({ "labels": label._id }, { $pull: { "labels": label._id } });
        let result = await Reader.updateMany(query, { $push: { "labels": label._id } });
        return result
    } catch (err) {
        console.error(err);
        return Promise.reject(err);
    }
}

LabelSchema.statics.apply_label = async function(data) {
    try {
        const label = await Label.findById(data.id);
        console.log(`Applying ${label.name}`);
        return await applyLabel(label);
    } catch (err) {
        console.error(err);
        return "An error occured";
    }
}

LabelSchema.statics.apply_labels = async function () {
    try {
        const labels = await Label.find({});
        let results = {};
        for (let label of labels) {
            console.log(`Applying ${label.name}`);
            results[label.name] = await applyLabel(label);
        }
        return results;
    } catch (err) {
        console.error(err);
        return "An error occured";
    }
}

LabelSchema.post('save', async function(doc) {
    console.log(`Applying ${doc.name}`);
    await applyLabel(doc);
});

const Label = mongoose.model('Label', LabelSchema)
module.exports = Label;
