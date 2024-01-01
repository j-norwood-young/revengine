const config = require("config");
require("dotenv").config();
const moment = require("moment");
const JXPHelper = require('jxp-helper');
const jxphelper = new JXPHelper({ server: config.api.server, apikey: process.env.APIKEY });
const fix_query = require("jxp/libs/query_manipulation").fix_query;
const ss = require("simple-statistics");

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
    code: { type: String, required: true },
    fn: String,
    display_on_dashboard: Boolean,
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
        if (!label.rules) return;
        if (label.fn) {
            const fn = new Function(label.fn);
            const data = (await fn()({ jxphelper, moment, ss })).data;
            const post_data = data.map(d => {
                const _id = d._id;
                delete(d._id);
                return {
                    _id,
                    label_data: d
                }
            })
            const keys = new Set();
            for (let d of post_data) {
                keys.add(...Object.keys(d.label_data));
            }
            for (let key of keys) {
                const u = {};
                const q = {};
                q[`label_data.${key}`] = { $exists: true };
                u[`label_data.${key}`] = null;
                await Reader.updateMany(q, u);
            }
            const updates = post_data.map(item => {
				const updateQuery = {
					"updateOne": {
						"upsert": true
					}
				}
				updateQuery.updateOne.update = item;
				updateQuery.updateOne.filter = {};
				updateQuery.updateOne.filter["_id"] = item["_id"];
				return updateQuery;
			});
            await Reader.bulkWrite(updates);
            // await jxphelper.bulk_postput("reader", "_id", post_data);
        }
        const query = fix_query(JSON.parse(label.rules[0]));
        const ids_before = (await Reader.find({ "label_id": label._id }).distinct("_id"))?.map(x => x?.toString());
        const ids_after = (await Reader.find(query).distinct("_id"))?.map(x => x?.toString());
        const ids_added = ids_after.filter(x => !ids_before.includes(x));
        const ids_removed = ids_before.filter(x => !ids_after.includes(x));
        const ids_changed = ids_added.concat(ids_removed);
        if (ids_changed.length === 0) return {
            insert_result: { nModified: 0 },
            delete_result: { nModified: 0 },
            ids_added_count: 0,
            ids_removed_count: 0,
            ids_changed_count: 0
        }
        const insert_result = await Reader.updateMany({ _id: { $in: ids_added } }, { $push: { "label_id": label._id }, $set: { "label_update": new Date() } });
        const delete_result = await Reader.updateMany({ _id: { $in: ids_removed } }, { $pull: { "label_id": label._id }, $set: { "label_update": new Date() } });
        const result = {
            insert_result,
            delete_result,
            ids_added_count: ids_added.length,
            ids_removed_count: ids_removed.length,
            ids_changed_count: ids_changed.length
        }
        if (process.env.NODE_ENV !== "production") console.log(result);
        return result
    } catch (err) {
        console.error(err);
        return Promise.reject(err);
    }
}

LabelSchema.statics.apply_label = async function(data) {
    try {
        if (!data.id) throw("id required");
        const label = await Label.findById(data.id);
        console.log(`Applying ${label.name}`);
        return await applyLabel(label);
    } catch (err) {
        console.error(err);
        return `An error occured: ${err.toString()}`;
    }
}

const apply_labels = async function () {
    try {
        const labels = await Label.find({ name: { $exists: 1 }, _deleted: { $ne: true}}).sort({ name: 1 });
        let results = {};
        for (let label of labels) {
            console.log(`Applying ${label.name}`);
            results[label.name] = await applyLabel(label).catch(err => `Error applying label: ${err.toString()}`);
        }
        return results;
    } catch (err) {
        console.error(err);
        return "An error occured";
    }
}

LabelSchema.statics.apply_labels = apply_labels;

LabelSchema.post('save', async function(doc) {
    console.log(`Applying ${doc.name}`);
    await applyLabel(doc);
});

// // Apply labels every hour
// if (process.env.NODE_ENV === "production") {
//     // Offset start by 30 mins
//     setTimeout(() => {
//         apply_labels();
//         setInterval(apply_labels, 60 * 60 * 1000);
//     }, 30 * 60 * 1000);
// }

const Label = JXPSchema.model('Label', LabelSchema);
module.exports = Label;
