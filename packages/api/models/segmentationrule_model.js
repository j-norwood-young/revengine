/* global JXPSchema ObjectId Mixed */

const SegmentationRuleSchema = new JXPSchema({
    name: { type: String, unique: true },
    field: String,
    op: String,
    val: String,
},
    {
        perms: {
            admin: "crud",
            user: "r"
        }
    });

const SegmentationRule = JXPSchema.model('segmentationrule', SegmentationRuleSchema);
module.exports = SegmentationRule;