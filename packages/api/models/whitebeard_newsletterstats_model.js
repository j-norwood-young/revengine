/* global JXPSchema Mixed ObjectId */

/**
 * Whitebeard newsletter send statistics (Channel Post entity from Whitebeard API v3.1).
 * Each document represents a single newsletter send (channel post) with its analytics.
 *
 * @see https://apidocsv3.whitebeard.net/?urls.primaryName=v3.1+(beta)#/Channel/postChannelPost
 */
const WhitebeardNewsletterStatsSchema = new JXPSchema(
	{
		// Whitebeard Channel Post id
		id: { type: Number, index: true, unique: true },

		// Link back to the parent Whitebeard newsletter channel record in JXP
		whitebeard_newsletter_id: { type: ObjectId, link: 'whitebeard_newsletters', index: true },

		// Raw Whitebeard channel id and name for convenience
		newsletterId: { type: Number, index: true },
		newsletterName: { type: String, index: true },

		// Send metadata
		subject: String,
		contents: String,
		status: { type: String, index: true },

		// When the post was sent/published
		sentAt: { type: Date, index: true },
		// Cached YYYY-MM-DD date string for efficient day-range queries
		sendDate: { type: String, index: true },

		// Flattened analytics for fast querying and aggregations
		total: { type: Number, index: true },
		delivered: { type: Number, index: true },
		failed: { type: Number, index: true },
		unsub: { type: Number, index: true },
		openUnique: { type: Number, index: true },
		clicksUnique: { type: Number, index: true },

		// Optional extended analytics (MPP / human / automated / unknown breakdowns)
		open: Number,
		clicks: Number,
		openHuman: Number,
		openHumanUnique: Number,
		openMpp: Number,
		openMppUnique: Number,
		openAutomated: Number,
		openAutomatedUnique: Number,
		openUnknown: Number,
		openUnknownUnique: Number,
		clicksHuman: Number,
		clicksHumanUnique: Number,
		clicksAutomated: Number,
		clicksAutomatedUnique: Number,
		clicksMpp: Number,
		clicksMppUnique: Number,

		// Last time this record was synced from Whitebeard
		lastSyncedAt: { type: Date, index: true },

		// Full raw analytics payload or any extra fields the API returns
		metadata: Mixed
	},
	{
		perms: {
			admin: 'crud',
			owner: 'crud',
			user: 'r',
			all: ''
		}
	}
);

WhitebeardNewsletterStatsSchema.index({ newsletterId: 1, sentAt: -1 });
WhitebeardNewsletterStatsSchema.index({ sendDate: 1 });
WhitebeardNewsletterStatsSchema.index({ lastSyncedAt: 1 });

const WhitebeardNewsletterStats = JXPSchema.model(
	'whitebeardnewsletterstats',
	WhitebeardNewsletterStatsSchema
);

module.exports = WhitebeardNewsletterStats;

