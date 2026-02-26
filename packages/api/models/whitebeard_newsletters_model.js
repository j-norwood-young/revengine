/* global JXPSchema Mixed */

/**
 * Whitebeard newsletter channels (Channel entity from Whitebeard API v3.1).
 * @see https://apidocsv3.whitebeard.net/?urls.primaryName=v3.1+(beta)#/Channel
 * GET /cms/channel/list returns enabled channels (filter by type: newsletter, email, etc.)
 * GET /cms/channel/{channel_id} returns channel details + optional statistics.
 */
const WhitebeardNewslettersSchema = new JXPSchema({
	// Whitebeard Channel id (API: integer/int64, stored as string for consistency)
	id: { type: String, index: true, unique: true },
	name: { type: String, index: true },
	image: String,
	description: String,
	objectType: { type: String, index: true },
	/** Channel type: newsletter, email, push, sms (from API filter / list response) */
	type: { type: String, index: true },
	/** Channel configuration (API: object) */
	configuration: Mixed,
	/** Optional status if returned by API */
	status: { type: String, index: true },
	/** Last time this record was synced from Whitebeard */
	lastSyncedAt: { type: Date, index: true },
	/** Raw payload for any extra fields the API returns */
	metadata: Mixed
},
{
	perms: {
		admin: "crud",
		owner: "crud",
		user: "r",
		all: ""
	}
});

WhitebeardNewslettersSchema.index({ type: 1 });
WhitebeardNewslettersSchema.index({ objectType: 1 });
WhitebeardNewslettersSchema.index({ lastSyncedAt: 1 });

const WhitebeardNewsletters = JXPSchema.model('whitebeardnewsletters', WhitebeardNewslettersSchema);
module.exports = WhitebeardNewsletters;
