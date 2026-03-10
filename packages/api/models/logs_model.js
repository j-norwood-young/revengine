/* global JXPSchema Mixed */

const LogsSchema = new JXPSchema({
	type: { type: String, index: true }, // e.g. "job", "auth", "billing"
	level: { type: String, index: true }, // e.g. "info", "warn", "error", "debug"
	message: String,

	context: Mixed, // structured payload (jobKey, durationMs, status, error, userId, tenantId, etc.)

	jobKey: { type: String, index: true, sparse: true },
	userId: { type: String, index: true, sparse: true },

	createdAt: { type: Date, index: true }
},
{
	perms: {
		admin: "crud",
		owner: "r",
		user: "",
		all: ""
	}
});

LogsSchema.index({ type: 1, createdAt: -1 });
LogsSchema.index({ jobKey: 1, createdAt: -1 });
LogsSchema.index({ level: 1, createdAt: -1 });

const Logs = JXPSchema.model('logs', LogsSchema);
module.exports = Logs;

