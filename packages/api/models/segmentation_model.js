/* global JXPSchema ObjectId Mixed */

const SegmentationSchema = new JXPSchema({
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

const applySegmentation = async function (segmentation) {
    const Reader = require("./reader_model");
    try {
        const query = generateQuery(segmentation.labels_and_id, segmentation.labels_not_id);
        await Reader.updateMany({ "segmentation_id": segmentation._id }, { $pull: { "segmentation_id": segmentation._id } });
        let result = await Reader.updateMany(query, { $push: { "segmentation_id": segmentation._id } });
        return result
    } catch (err) {
        console.error(err);
        return Promise.reject(err);
    }
}

const apply_segmentations = async function () {
    try {
        const segmentations = await Segmentation.find({ name: { $exists: 1 }});
        let results = {};
        for (let segmentation of segmentations) {
            console.log(`Applying ${segmentation.name}`);
            results[segmentation.name] = await applySegmentation(segmentation).catch(err => `Error applying segmentation: ${err.toString()}`);
        }
        return results;
    } catch (err) {
        console.error(err);
        return "An error occured";
    }
}

SegmentationSchema.statics.apply_segmentations = apply_segmentations;

SegmentationSchema.post('save', async function(doc) {
    console.log(`Applying ${doc.name}`);
    await applySegmentation(doc);
});

// Apply labels every half-hour
setInterval(apply_segmentations, 30 * 60 * 1000);

const Segmentation = JXPSchema.model('segmentation', SegmentationSchema);
module.exports = Segmentation;