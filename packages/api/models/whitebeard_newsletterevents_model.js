/* global JXPSchema ObjectId Mixed */

const WhitebeardNewsletterEventSchema = new JXPSchema(
	{
		event: {
			type: String,
			index: true,
			enum: ['subscribe', 'unsubscribe', 'click', 'open']
		},
		newsletter_id: { type: ObjectId, link: 'whitebeard_newsletters', index: true },
		reader_id: { type: ObjectId, link: 'reader', index: true },
		timestamp: { type: Date, index: true, default: Date.now },
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

// Primary query patterns for event history and trend analysis.
WhitebeardNewsletterEventSchema.index({ timestamp: -1 });
WhitebeardNewsletterEventSchema.index({ event: 1, timestamp: -1 });
WhitebeardNewsletterEventSchema.index({ newsletter_id: 1, timestamp: -1 });
WhitebeardNewsletterEventSchema.index({ reader_id: 1, timestamp: -1 });
WhitebeardNewsletterEventSchema.index({ newsletter_id: 1, event: 1, timestamp: -1 });
WhitebeardNewsletterEventSchema.index({ reader_id: 1, event: 1, timestamp: -1 });

const WhitebeardNewsletterEvent = JXPSchema.model(
	'whitebeardnewsletterevents',
	WhitebeardNewsletterEventSchema
);

module.exports = WhitebeardNewsletterEvent;
