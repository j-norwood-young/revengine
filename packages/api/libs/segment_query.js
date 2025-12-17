/* global Mixed */

// Builds a MongoDB query for the Reader collection from SegmentCondition[].
// SegmentCondition shape (server-side):
// { field: string, operator: string, value: Mixed, logicalOperator?: 'AND'|'OR' }

const DEFAULT_LOGICAL = "AND";

function isSafeMongoFieldPath(field) {
	if (typeof field !== "string") return false;
	if (!field.length) return false;
	if (field.includes("\0")) return false;
	// Disallow mongo operator injection
	if (field.startsWith("$")) return false;
	if (field.includes("$")) return false;
	// allow dot paths like "profile.country"
	return /^[a-zA-Z0-9_.]+$/.test(field);
}

function escapeRegexLiteral(str) {
	return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function coerceDate(v) {
	if (v == null) return null;
	if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
	if (typeof v === "number") {
		const d = new Date(v);
		return Number.isNaN(d.getTime()) ? null : d;
	}
	if (typeof v === "string") {
		const d = new Date(v);
		return Number.isNaN(d.getTime()) ? null : d;
	}
	return null;
}

function normalizeArray(v) {
	if (Array.isArray(v)) return v;
	if (v == null) return [];
	return [v];
}

function buildSingleConditionQuery(cond) {
	if (!cond || typeof cond !== "object") throw new Error("Invalid condition");
	const { field, operator, value } = cond;

	if (!isSafeMongoFieldPath(field)) {
		throw new Error(`Unsafe field path: ${String(field)}`);
	}
	if (typeof operator !== "string" || !operator.length) {
		throw new Error("operator required");
	}

	switch (operator) {
		case "equals":
			return { [field]: value };
		case "not_equals":
			return { [field]: { $ne: value } };
		case "contains": {
			const re = escapeRegexLiteral(value);
			return { [field]: { $regex: re, $options: "i" } };
		}
		case "not_contains": {
			const re = escapeRegexLiteral(value);
			return { [field]: { $not: { $regex: re, $options: "i" } } };
		}
		case "starts_with": {
			const re = `^${escapeRegexLiteral(value)}`;
			return { [field]: { $regex: re, $options: "i" } };
		}
		case "ends_with": {
			const re = `${escapeRegexLiteral(value)}$`;
			return { [field]: { $regex: re, $options: "i" } };
		}
		case "greater_than":
			return { [field]: { $gt: value } };
		case "less_than":
			return { [field]: { $lt: value } };
		case "greater_than_or_equal":
			return { [field]: { $gte: value } };
		case "less_than_or_equal":
			return { [field]: { $lte: value } };
		case "in":
			return { [field]: { $in: normalizeArray(value) } };
		case "not_in":
			return { [field]: { $nin: normalizeArray(value) } };
		case "is_null":
			return { $or: [{ [field]: null }, { [field]: { $exists: false } }] };
		case "is_not_null":
			return { $and: [{ [field]: { $ne: null } }, { [field]: { $exists: true } }] };
		case "date_before": {
			const d = coerceDate(value);
			if (!d) throw new Error("date_before requires a valid date value");
			return { [field]: { $lt: d } };
		}
		case "date_after": {
			const d = coerceDate(value);
			if (!d) throw new Error("date_after requires a valid date value");
			return { [field]: { $gt: d } };
		}
		case "date_between": {
			let from = null;
			let to = null;
			if (Array.isArray(value)) {
				from = coerceDate(value[0]);
				to = coerceDate(value[1]);
			} else if (value && typeof value === "object") {
				from = coerceDate(value.from);
				to = coerceDate(value.to);
			}
			if (!from || !to) throw new Error("date_between requires {from,to} or [from,to]");
			return { [field]: { $gte: from, $lte: to } };
		}
		default:
			throw new Error(`Unsupported operator: ${operator}`);
	}
}

function buildMongoQueryFromSegmentConditions(conditions) {
	if (!Array.isArray(conditions) || conditions.length === 0) return {};

	// Interpret logicalOperator as the connector *to the previous clause*.
	// First condition ignores logicalOperator.
	const clauses = [];
	let currentAndGroup = [];
	let orGroups = [];

	for (let i = 0; i < conditions.length; i++) {
		const cond = conditions[i];
		const connector =
			i === 0 ? DEFAULT_LOGICAL : (cond.logicalOperator || DEFAULT_LOGICAL).toUpperCase();
		const q = buildSingleConditionQuery(cond);

		if (connector === "OR") {
			// close current AND group into OR list, start new AND group
			if (currentAndGroup.length) orGroups.push(currentAndGroup);
			currentAndGroup = [q];
		} else {
			currentAndGroup.push(q);
		}
	}
	if (currentAndGroup.length) orGroups.push(currentAndGroup);

	// Convert groups into Mongo structure
	if (orGroups.length === 1) {
		const group = orGroups[0];
		if (group.length === 1) return group[0];
		return { $and: group };
	}

	return { $or: orGroups.map(group => (group.length === 1 ? group[0] : { $and: group })) };
}

module.exports = {
	buildMongoQueryFromSegmentConditions,
	isSafeMongoFieldPath,
};


