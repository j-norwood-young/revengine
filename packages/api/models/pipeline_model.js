/* global JXPSchema ObjectId Mixed */

const PipelineSchema = new JXPSchema(
    {
        name: String,
        pipeline: Mixed,
        cron: String,
        autorun: { type: Boolean, default: false, index: true },
        running: Boolean,
        run_start: Date,
        last_run_start: Date,
        last_run_end: Date,
        last_run_result: Mixed,
    },
    {
        perms: {
            admin: "crud", 
            owner: "crud",
            user: "r",
            all: "" 
        }
    }
);

// Finally, we export our model. Make sure to change the name!
const Pipeline = JXPSchema.model('Pipeline', PipelineSchema);
module.exports = Pipeline;