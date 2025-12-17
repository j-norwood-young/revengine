/* global JXPSchema ObjectId Mixed */

const { buildMongoQueryFromSegmentConditions } = require("../libs/segment_query");

const SegmentConditionSchema = {
	id: { type: String, index: true },
	field: { type: String, required: true },
	operator: {
		type: String,
		required: true,
		enum: [
			"equals",
			"not_equals",
			"contains",
			"not_contains",
			"starts_with",
			"ends_with",
			"greater_than",
			"less_than",
			"greater_than_or_equal",
			"less_than_or_equal",
			"in",
			"not_in",
			"is_null",
			"is_not_null",
			"date_before",
			"date_after",
			"date_between",
		],
	},
	value: Mixed,
	logicalOperator: { type: String, enum: ["AND", "OR"], default: "AND" },
};

const SegmentSchema = new JXPSchema(
	{
		name: { type: String, unique: true, required: true, index: true },
		description: String,
		conditions: { type: [SegmentConditionSchema], default: [] },

		customerCount: { type: Number, default: 0 },
		isActive: { type: Boolean, default: true, index: true },

		createdAt: { type: Date, default: Date.now, index: true },
		updatedAt: { type: Date, default: Date.now, index: true },
		createdBy: { type: String, index: true },
	},
	{
		perms: {
			admin: "crud",
			user: "r",
		},
	}
);

function ensureConditionIds(segment) {
	if (!Array.isArray(segment.conditions)) return;
	for (const cond of segment.conditions) {
		if (!cond) continue;
		if (!cond.id) cond.id = new ObjectId().toString();
	}
}

SegmentSchema.pre("save", function (next) {
	try {
		if (!this.createdAt) this.createdAt = new Date();
		this.updatedAt = new Date();
		ensureConditionIds(this);
		next();
	} catch (e) {
		next(e);
	}
});

const updateSegmentStats = async function (segment) {
	const Reader = require("./reader_model");
	const count = await Reader.countDocuments({ segment_id: segment._id });
	await Segment.findOneAndUpdate(
		{ _id: segment._id },
		{ customerCount: count, updatedAt: new Date() }
	);
	if (process.env.NODE_ENV !== "production") console.log(`Segment ${segment.name} has ${count} customers`);
};

const applySegment = async function (segment) {
	const Reader = require("./reader_model");
	try {
		const ids_before = (await Reader.find({ segment_id: segment._id }).distinct("_id"))?.map(x => x?.toString());

		let ids_after = [];
		if (segment.isActive !== false) {
			const query = buildMongoQueryFromSegmentConditions(segment.conditions || []);
			ids_after = (await Reader.find(query).distinct("_id"))?.map(x => x?.toString());
		}

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
				ids_changed_count: 0,
			};
		}

		const per_page = 10000;

		const insert_pages = Math.ceil(ids_added.length / per_page);
		const insert_result = [];
		for (let i = 0; i < insert_pages; i++) {
			const ids_added_page = ids_added.slice(i * per_page, (i + 1) * per_page);
			insert_result.push(
				await Reader.updateMany(
					{ _id: { $in: ids_added_page } },
					{ $addToSet: { segment_id: segment._id }, $set: { segment_update_v2: new Date() } }
				)
			);
		}

		const delete_pages = Math.ceil(ids_removed.length / per_page);
		const delete_result = [];
		for (let i = 0; i < delete_pages; i++) {
			const ids_removed_page = ids_removed.slice(i * per_page, (i + 1) * per_page);
			delete_result.push(
				await Reader.updateMany(
					{ _id: { $in: ids_removed_page } },
					{ $pull: { segment_id: segment._id }, $set: { segment_update_v2: new Date() } }
				)
			);
		}

		const result = {
			insert_result,
			delete_result,
			ids_added_count: ids_added.length,
			ids_removed_count: ids_removed.length,
			ids_changed_count: ids_changed.length,
		};
		if (process.env.NODE_ENV !== "production") console.log(result);
		await updateSegmentStats(segment);
		return result;
	} catch (err) {
		console.error(err);
		return Promise.reject(err);
	}
};

const apply_segments = async function () {
	try {
		console.time("apply_segments_v2");
		if (process.env.NODE_ENV !== "production") console.log("Applying segments (v2)");
		const segments = await Segment.find({ name: { $exists: 1 }, _deleted: { $ne: true } }).sort({
			updatedAt: -1,
		});
		let results = {};
		for (let segment of segments) {
			if (process.env.NODE_ENV !== "production") console.log(`Applying ${segment.name}`);
			results[segment.name] = await applySegment(segment).catch(err => `Error applying segment: ${err.toString()}`);
		}
		if (process.env.NODE_ENV !== "production") console.log("Done applying segments (v2)");
		console.timeEnd("apply_segments_v2");
		return results;
	} catch (err) {
		console.error(err);
		return "An error occured";
	}
};

SegmentSchema.statics.apply_segments = apply_segments;

SegmentSchema.statics.apply_segment = async function (data) {
	try {
		if (!data.id) throw "id required";
		const segment = await Segment.findById(data.id);
		if (!segment) throw "segment not found";
		return await applySegment(segment);
	} catch (err) {
		console.error(err);
		return `An error occured: ${err.toString()}`;
	}
};

SegmentSchema.post("save", async function (doc) {
	if (process.env.NODE_ENV !== "production") console.log(`Applying segment (v2) ${doc.name}`);
	await applySegment(doc);
	if (process.env.NODE_ENV !== "production") console.log(`Done applying segment (v2) ${doc.name}`);
});

const Segment = JXPSchema.model("segment", SegmentSchema);
module.exports = Segment;