/* global JXPSchema ObjectId Mixed */

const TouchbaseEventSchema = new JXPSchema({
    event: String,
    email: String,
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

const TouchbaseEvent = JXPSchema.model('TouchbaseEvent', TouchbaseEventSchema);
module.exports = TouchbaseEvent;