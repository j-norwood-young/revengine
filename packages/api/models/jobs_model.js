/* global JXPSchema */

const JobsSchema = new JXPSchema({
	key: { type: String, index: true, unique: true }, // stable identifier, e.g. "home-locations"
	name: { type: String, index: true },
	description: String,
	enabled: { type: Boolean, index: true },
	schedule: { type: String, index: true }, // cron expression or null

	lastRunAt: { type: Date, index: true },
	lastDurationMs: Number,
	lastStatus: { type: String, index: true }, // success | failed | running | idle
	lastError: String,

	createdAt: { type: Date, index: true },
	updatedAt: { type: Date, index: true }
},
{
	perms: {
		admin: "crud",
		owner: "crud",
		user: "r",
		all: ""
	}
});

JobsSchema.index({ key: 1 });
JobsSchema.index({ enabled: 1 });
JobsSchema.index({ lastRunAt: 1 });

const Jobs = JXPSchema.model('jobs', JobsSchema);
module.exports = Jobs;

