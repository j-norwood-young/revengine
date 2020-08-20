/* global JXPSchema ObjectId Mixed */

const TouchbaseCampaignSchema = new JXPSchema({
    name: String,
    campaign_id: { type: String, unique: true },
    sent_date: { type: Date, index: true },
    from_name: String,
    from_email: String,
    reply_to: String,
    total_recipients: Number,
    subject: String,
    url: String,
    text_url: String
},
{
    perms: {
        admin: "crud",
    }
});

const TouchbaseCampaign = JXPSchema.model('TouchbaseCampaign', TouchbaseCampaignSchema);
module.exports = TouchbaseCampaign;