/* global JXPSchema */

const HitSchema = new JXPSchema({
    uid: { type: String, index: true },
    timestamp: { type: Date, index: true },
    url: String,
    user_agent: String,
    email: { type: String, index: true },
    article_id: { type: ObjectId, link: "article", index: true },
    reader_id: { type: ObjectId, link: "reader", index: true },
    campaign_id: { type: ObjectId, link: "touchbasecampaign" },
    ip_address: String,
    source: String,
},
{
    perms: {
        admin: "crud",
        owner: "crud",
        user: "cr",
        all: ""
    }
});

const Hit = JXPSchema.model('hit', HitSchema);
module.exports = Hit;