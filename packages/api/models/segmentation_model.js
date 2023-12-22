/* global JXPSchema ObjectId Mixed */

const SegmentSchema = new JXPSchema({
    name: {type: String, unique: true, required: true },
    code: {type: String, unique: true, required: true },
    labels_and_id: [{ type: ObjectId, link: "label", map_to: "labels_and" }],
    labels_not_id: [{ type: ObjectId, link: "label", map_to: "labels_not" }],
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

const applySegment = async function (segment) {
    const Reader = require("./reader_model");
    try {
        const query = generateQuery(segment.labels_and_id, segment.labels_not_id);
        const ids_before = (await Reader.find({ "segmentation_id": segment._id }).distinct("_id"))?.map(x => x?.toString());
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
        const insert_result = await Reader.updateMany({ _id: { $in: ids_added } }, { $push: { "segmentation_id": segment._id }, $set: { "segment_update": new Date() } });
        const delete_result = await Reader.updateMany({ _id: { $in: ids_removed } }, { $pull: { "segmentation_id": segment._id }, $set: { "segment_update": new Date() } });
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

const apply_segments = async function () {
    try {
        const segments = await Segmentation.find({ name: { $exists: 1 }});
        let results = {};
        for (let segment of segments) {
            console.log(`Applying ${segment.name}`);
            results[segment.name] = await applySegment(segment).catch(err => `Error applying segment: ${err.toString()}`);
        }
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
    console.log(`Applying segment ${doc.name}`);
    await applySegment(doc);
});

// Apply segments every hour
if (process.env.NODE_ENV === "production") {
    setInterval(apply_segments, 60 * 60 * 1000);
}

const Segmentation = JXPSchema.model('segmentation', SegmentSchema);
module.exports = Segmentation;