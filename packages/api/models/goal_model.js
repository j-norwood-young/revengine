/* global JXPSchema ObjectId Mixed */

const GoalSchema = new JXPSchema({
    name: {type: String, unique: true, required: true },
    segment_id: [{ type: ObjectId, link: "segmentation" }],
    goals: [{
        date: Date,
        target: Number
    }],
    data: [{
        date: Date,
        stat: Number
    }]
},
{
    perms: {
        admin: "crud",
        user: "r"
    }
});

const Goal = JXPSchema.model('goal', GoalSchema);
module.exports = Goal;