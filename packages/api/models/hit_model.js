/* global JXPSchema */

const HitSchema = new JXPSchema({
    uid: { type: String, index: true },
    timestamp: { type: Date, index: true },
    url: String,
    user_agent: String,
    email: String,
    article_id: { type: ObjectId, link: "article" },
    reader_id: { type: ObjectId, link: "reader" },
    campaign_id: { type: ObjectId, link: "touchbasecampaign" },
    post_id: Number,
    ip_addr: String,
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