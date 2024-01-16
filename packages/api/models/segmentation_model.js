/* global JXPSchema ObjectId Mixed */

const SegmentSchema = new JXPSchema({
    name: {type: String, unique: true, required: true },
    code: {type: String, unique: true, required: true },
    labels_and_id: [{ type: ObjectId, link: "label", map_to: "labels_and" }],
    labels_not_id: [{ type: ObjectId, link: "label", map_to: "labels_not" }],
    last_count: Number,
    last_count_date: Date,
    dirty: { type: Boolean, default: true },
},
{
    perms: {
        admin: "crud",
        user: "r"
    }
});

const generateQuery = (labels_and, labels_not) => {
    if (!Array.isArray(labels_and)) labels_and = [labels_and];
    if (!Array.isArray(labels_not)) labels_not = [labels_not];
    const labels_and_id = labels_and ? labels_and.map(label => label) : [];
    const labels_not_id = labels_not ? labels_not.map(label => label) : [];
    const query = {
        "$and": [
            {
                label_id: { "$in": labels_and_id }
            },
            {
                label_id: { 
                    "$not": {
                        "$in": labels_not_id 
                    }
                }
            }
        ]
    };
    return query;
}

const updateSegmentStats = async function (segment) {
    const Reader = require("./reader_model");
    const count = await Reader.countDocuments({ "segmentation_id": segment._id });
    await Segment.findOneAndUpdate({ _id: segment._id }, { last_count: count, last_count_date: new Date(), dirty: false });
    if (process.env.NODE_ENV !== "production") console.log(`Segment ${segment.name} has ${count} readers`);
}

const applySegment = async function (segment) {
    const Reader = require("./reader_model");
    try {
        const query = generateQuery(segment.labels_and_id, segment.labels_not_id);
        const ids_before = (await Reader.find({ "segmentation_id": segment._id }).distinct("_id"))?.map(x => x?.toString());
        const ids_after = (await Reader.find(query).distinct("_id"))?.map(x => x?.toString());
        const ids_before_set = new Set(ids_before);
        const ids_after_set = new Set(ids_after);

        const ids_added = [...ids_after_set].filter(x => !ids_before_set.has(x));
        const ids_removed = [...ids_before_set].filter(x => !ids_after_set.has(x));
        const ids_changed = [...ids_added, ...ids_removed];

        if (ids_changed.length === 0) {
            await updateSegmentStats(segment);
            return {
                insert_result: { nModified: 0 },
                delete_result: { nModified: 0 },
                ids_added_count: 0,
                ids_removed_count: 0,
                ids_changed_count: 0
            }
        }
        const per_page = 10000;
        const insert_pages = Math.ceil(ids_added.length / per_page);
        const insert_result = [];
        for (let i = 0; i < insert_pages; i++) {
            const ids_added_page = ids_added.slice(i * per_page, (i + 1) * per_page);
            insert_result.push(await Reader.updateMany({ _id: { $in: ids_added_page } }, { $push: { "segmentation_id": segment._id }, $set: { "segment_update": new Date() } }));
        }
        const delete_pages = Math.ceil(ids_removed.length / per_page);
        const delete_result = [];
        for (let i = 0; i < delete_pages; i++) {
            const ids_removed_page = ids_removed.slice(i * per_page, (i + 1) * per_page);
            delete_result.push(await Reader.updateMany({ _id: { $in: ids_removed_page } }, { $pull: { "segmentation_id": segment._id }, $set: { "segment_update": new Date() } }));
        }
        const result = {
            insert_result,
            delete_result,
            ids_added_count: ids_added.length,
            ids_removed_count: ids_removed.length,
            ids_changed_count: ids_changed.length
        }
        if (process.env.NODE_ENV !== "production") console.log(result);
        await updateSegmentStats(segment);
        return result
    } catch (err) {
        console.error(err);
        return Promise.reject(err);
    }
}

const apply_segments = async function () {
    try {
        console.time("apply_segments");
        if (process.env.NODE_ENV !== "production") console.log("Applying segments");
        const segments = await Segment.find({ name: { $exists: 1 }, _deleted: { $ne: true}}).sort({ dirty: -1, last_count_date: -1 });
        let results = {};
        for (let segment of segments) {
            if (process.env.NODE_ENV !== "production") console.log(`Applying ${segment.name}`);
            results[segment.name] = await applySegment(segment).catch(err => `Error applying segment: ${err.toString()}`);
        }
        if (process.env.NODE_ENV !== "production") console.log("Done applying segments");
        console.timeEnd("apply_segments");
        return results;
    } catch (err) {
        console.error(err);
        return "An error occured";
    }
}

// Deprecated
SegmentSchema.statics.apply_segmentations = apply_segments;
SegmentSchema.statics.apply_segments = apply_segments;

SegmentSchema.post('save', async function(doc) {
    if (process.env.NODE_ENV !== "production") console.log(`Applying segment ${doc.name}`);
    await applySegment(doc);
    if (process.env.NODE_ENV !== "production") console.log(`Done applying segment ${doc.name}`);
});

// Apply segments every hour
// if (process.env.NODE_ENV === "production") {
//     setInterval(apply_segments, 60 * 60 * 1000);
// }

const Segment = JXPSchema.model('segmentation', SegmentSchema);
module.exports = Segment;