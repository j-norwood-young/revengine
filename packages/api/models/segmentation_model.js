/* global JXPSchema ObjectId Mixed */

const SegmentationSchema = new JXPSchema({
    name: {type: String, unique: true },
    rules: [{ type: ObjectId, link: "segmentationrule" }]
},
{
    perms: {
        admin: "crud",
        user: "r"
    }
});

const Segmentation = JXPSchema.model('segmentation', SegmentationSchema);
module.exports = Segmentation;