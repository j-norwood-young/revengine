/* global JXPSchema ObjectId Mixed */

const TouchbaseCampaignSchema = new JXPSchema({
    name: { type: String, unique: true },
    campaign_id: String,
    sent_date: Date,
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