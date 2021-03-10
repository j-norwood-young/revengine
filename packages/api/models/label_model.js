const config = require("config");
require("dotenv").config();
const moment = require("moment");
const JXPHelper = require('jxp-helper');
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const fix_query = require("jxp/libs/query_manipulation").fix_query;

const LabelSchema = new JXPSchema({
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
    code: String,
    fn: String,
}, {
    perms: {
        admin: "crud", // CRUD = Create, Retrieve, Update and Delete
        owner: "crud",
        user: "r",
    }
});

const applyLabel = async function (label) {
    const Reader = require("./reader_model");
    try {
        let query = [];
        if (!label.rules) return;
        if (label.fn) {
            const fn = new Function(label.fn);
            const data = (await fn()({ jxphelper, moment })).data;
            const post_data = data.map(d => {
                const _id = d._id;
                delete(d._id);
                return {
                    _id,
                    label_data: d
                }
            })
            await jxphelper.bulk_postput("reader", "_id", post_data);
        }
        for (let rule of label.rules) {
            query = fix_query(JSON.parse(rule));
        }
        await Reader.updateMany({ "label_id": label._id }, { $pull: { "label_id": label._id } });
        let result = await Reader.updateMany(query, { $push: { "label_id": label._id } });
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

const Label = JXPSchema.model('Label', LabelSchema);
module.exports = Label;
