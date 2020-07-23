/* global JXPSchema */

const DailyHitSchema = new JXPSchema({
    uid: String,
    article_id: Number,
    urlid: String,
    date: Date,
    hits: [ Mixed ],
},
{
    perms: {
        admin: "crud",
        owner: "crud",
        user: "cr",
        all: ""
    }
});

const DailyHit = JXPSchema.model('DailyHit', DailyHitSchema);
module.exports = DailyHit;