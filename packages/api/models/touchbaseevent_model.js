/* global JXPSchema ObjectId Mixed */

const TouchbaseEventSchema = new JXPSchema({
    event: String,
    email: { type: String, email: true },
    url: String,
    touchbase_campaign_id: String,
    touchbase_list_id: String,
    campaign_id: { type: ObjectId, link: "touchbasecampaign"},
    list_id: { type: ObjectId, link: "touchbaselist" },
    timestamp: { type: Date, index: true },
    ip_address: String,
    latitude: String,
    longitude: String,
    city: String,
    region: String,
    country_code: String,
    country_name: String,
    uid: { type: String, unique: true },
},
{
    perms: {
        admin: "crud",
    }
});

TouchbaseEventSchema.index({ email: 1, timestamp: -1 });
TouchbaseEventSchema.index({ email: 1, campaign_id: 1 });
TouchbaseEventSchema.index({ email: 1, campaign_id: 1, timestamp: 1 });
TouchbaseEventSchema.index({ timestamp: -1, event: 1 });

const TouchbaseEvent = JXPSchema.model('touchbaseevent', TouchbaseEventSchema);
module.exports = TouchbaseEvent;