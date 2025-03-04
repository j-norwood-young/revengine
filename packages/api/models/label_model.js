const config = require("config");
require("dotenv").config();
const moment = require("moment");
const JXPHelper = require('jxp-helper');
const jxphelper = new JXPHelper({ server: process.env.API_SERVER || config.api.server, apikey: process.env.APIKEY });
const fix_query = require("jxp/libs/query_manipulation").fix_query;
const ss = require("simple-statistics");
const crypto = require("crypto");

const LabelSchema = new JXPSchema({
    name: { type: String, unique: true },
    rules: {
        type: [String],
        validate: {
            validator: function (v) {
                try {
                    JSON.parse(v);
                    return true;
                } catch (err) {
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
    last_count: Number,
    last_count_date: Date,
    dirty: { type: Boolean, default: true },
}, {
    perms: {
        admin: "crud", // CRUD = Create, Retrieve, Update and Delete
        owner: "crud",
        user: "r",
    }
});

const updateLabelStats = async function (label) {
    const Reader = require("./reader_model");
    const count = await Reader.countDocuments({ "label_id": label._id });
    await Label.findOneAndUpdate({ _id: label._id }, { last_count: count, last_count_date: new Date(), dirty: false });
    if (process.env.NODE_ENV !== "production") console.log(`Label ${label.name} has ${count} readers`);
}

const objToMd5 = function (obj) {
    const md5 = crypto.createHash('md5');
    const s = JSON.stringify(obj);
    md5.update(s);
    return md5.digest('hex');
}

const optimiseBulkUpdate = function (bulk_updates) {
    // Take all the matching updateOnes and merge them into an updateMany
    const update_patterns = {};
    const update_patterns_ids = {};
    // console.log(JSON.stringify(bulk_updates.slice(0, 2), null, 2));
    for (let update of bulk_updates) {
        if (!update.updateOne?.update || Object.keys(update.updateOne.update).length === 0) continue;
        const md5 = objToMd5(update.updateOne.update);
        if (!update_patterns[md5]) {
            update_patterns[md5] = update.updateOne.update;
            update_patterns_ids[md5] = [update.updateOne.filter._id];
        } else {
            update_patterns_ids[md5].push(update.updateOne.filter._id);
        }
    }
    const optimised_updates = [];
    for (let md5 in update_patterns) {
        const updateOne = {
            updateMany: {
                filter: {
                    _id: { $in: update_patterns_ids[md5] }
                },
                update: update_patterns[md5]
            }
        }
        optimised_updates.push(updateOne);
    }
    const max_per_update = 10000;
    const optimised_updates_sliced = [];
    for (let update of optimised_updates) {
        const ids = update.updateMany.filter._id.$in;
        if (ids.length > max_per_update) {
            const pages = Math.ceil(ids.length / max_per_update);
            for (let i = 0; i < pages; i++) {
                const updateOne = {
                    updateMany: {
                        filter: {
                            _id: { $in: ids.slice(i * max_per_update, (i + 1) * max_per_update) }
                        },
                        update: update.updateMany.update
                    }
                }
                optimised_updates_sliced.push(updateOne);
            }
        } else {
            optimised_updates_sliced.push(update);
        }
    }
    return optimised_updates_sliced;
}

const applyLabel = async function (label) {
    const Reader = require("./reader_model");
    try {
        if (!label.rules) return;
        if (label.fn) {
            if (process.env.NODE_ENV !== "production") console.time("fn");
            const fn = new Function(label.fn);
            const data = (await fn()({ jxphelper, moment, ss })).data;
            const post_data = data.map(d => {
                const _id = d._id;
                delete (d._id);
                return {
                    _id,
                    label_data: d
                }
            })
            console.log({ post_data: JSON.stringify(post_data.slice(0, 2), null, 2) });
            const keys = new Set();
            for (let d of post_data) {
                keys.add(...Object.keys(d.label_data));
            }
            for (let key of keys) {
                const u = {};
                const q = {};
                q[`label_data.${key}`] = { $exists: true };
                u[`label_data.${key}`] = null;
                if (process.env.NODE_ENV !== "production") console.log({ q, u })
                await Reader.updateMany(q, u);
            }
            const updates = post_data.map(item => {
                const updateQuery = {
                    "updateOne": {
                        "upsert": true
                    }
                }
                const update_item = Object.assign({}, item);
                delete (update_item._id);
                updateQuery.updateOne.update = update_item;
                updateQuery.updateOne.filter = {};
                updateQuery.updateOne.filter["_id"] = item["_id"];
                return updateQuery;
            });
            const optimised_updates = optimiseBulkUpdate(updates);
            if (process.env.NODE_ENV !== "production") console.timeEnd("fn");
            if (process.env.NODE_ENV !== "production") console.time("bulkWrite");
            if (process.env.NODE_ENV !== "production") console.log({ updates_length: updates.length, optimised_updates_length: optimised_updates.length })
            const bulk_write_result = await Reader.bulkWrite(optimised_updates);
            if (process.env.NODE_ENV !== "production") console.log({ bulk_write_result });
            if (process.env.NODE_ENV !== "production") console.timeEnd("bulkWrite");
            // await jxphelper.bulk_postput("reader", "_id", post_data);
        }
        if (process.env.NODE_ENV !== "production") console.time("fix_query");
        const query = fix_query(JSON.parse(label.rules[0]));
        if (process.env.NODE_ENV !== "production") console.log({ query: JSON.stringify(query, null, 2) });
        if (process.env.NODE_ENV !== "production") console.timeEnd("fix_query");
        if (process.env.NODE_ENV !== "production") console.time("ids_before");
        const ids_before = (await Reader.aggregate([
            { $match: { "label_id": label._id } },
            { $project: { _id: 1 } },
        ])).map(x => x?._id?.toString()).filter(x => x);
        if (process.env.NODE_ENV !== "production") console.log({ length: ids_before.length })
        if (process.env.NODE_ENV !== "production") console.timeEnd("ids_before");
        if (process.env.NODE_ENV !== "production") console.time("ids_after");
        const ids_after = (await Reader.aggregate([
            { $match: query },
            { $project: { _id: 1 } },
        ])).map(x => x?._id?.toString()).filter(x => x);
        if (process.env.NODE_ENV !== "production") console.log({ length: ids_after.length });
        if (process.env.NODE_ENV !== "production") console.timeEnd("ids_after");
        // return;
        if (process.env.NODE_ENV !== "production") console.time("calc_diff");
        const ids_before_set = new Set(ids_before);
        const ids_after_set = new Set(ids_after);

        const ids_added = [...ids_after_set].filter(x => !ids_before_set.has(x));
        const ids_removed = [...ids_before_set].filter(x => !ids_after_set.has(x));
        const ids_changed = [...ids_added, ...ids_removed];

        if (process.env.NODE_ENV !== "production") console.timeEnd("calc_diff");

        if (ids_changed.length === 0) {
            await updateLabelStats(label);
            return {
                insert_result: { nModified: 0 },
                delete_result: { nModified: 0 },
                ids_added_count: 0,
                ids_removed_count: 0,
                ids_changed_count: 0
            }
        }
        const per_page = 500;
        const insert_pages = Math.ceil(ids_added.length / per_page);
        if (process.env.NODE_ENV !== "production") console.log({ insert_pages })
        const insert_result = [];
        for (let i = 0; i < insert_pages; i++) {
            const ids_added_page = ids_added.slice(i * per_page, (i + 1) * per_page);
            insert_result.push(await Reader.updateMany({ _id: { $in: ids_added_page } }, { $push: { "label_id": label._id }, $set: { "label_update": new Date() } }));
        }
        const delete_pages = Math.ceil(ids_removed.length / per_page);
        if (process.env.NODE_ENV !== "production") console.log({ delete_pages })
        const delete_result = [];
        for (let i = 0; i < delete_pages; i++) {
            const ids_removed_page = ids_removed.slice(i * per_page, (i + 1) * per_page);
            delete_result.push(await Reader.updateMany({ _id: { $in: ids_removed_page } }, { $pull: { "label_id": label._id }, $set: { "label_update": new Date() } }));
        }
        const result = {
            insert_result,
            delete_result,
            ids_added_count: ids_added.length,
            ids_removed_count: ids_removed.length,
            ids_changed_count: ids_changed.length
        }
        if (process.env.NODE_ENV !== "production") console.log(result);
        await updateLabelStats(label);
        return result
    } catch (err) {
        console.error(err);
        return Promise.reject(err);
    }
}

LabelSchema.statics.apply_label = async function (data) {
    try {
        if (!data.id) throw ("id required");
        const label = await Label.findById(data.id);
        console.time(`apply_label_${label._id}`);
        console.log(`Applying ${label.name}`);
        console.timeEnd(`apply_label_${label._id}`);
        return await applyLabel(label);
    } catch (err) {
        console.error(err);
        return `An error occured: ${err.toString()}`;
    }
}

const apply_labels = async function () {
    try {
        console.time("apply_labels");
        if (process.env.NODE_ENV !== "production") console.log("Applying labels");
        const labels = await Label.find({ name: { $exists: 1 }, _deleted: { $ne: true } }).sort({ last_count_date: 1 });
        let results = {};
        for (let label of labels) {
            console.log(`Applying ${label.name}`);
            results[label.name] = await applyLabel(label).catch(err => `Error applying label: ${err.toString()}`);
        }
        if (process.env.NODE_ENV !== "production") console.log("Done applying labels");
        console.timeEnd("apply_labels");
        return results;
    } catch (err) {
        console.error(err);
        return "An error occured";
    }
}

LabelSchema.statics.apply_labels = apply_labels;

LabelSchema.post('save', async function (doc) {
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
