/* global JXPSchema ObjectId Mixed */

const TouchbaseListStatsSchema = new JXPSchema({
    date: Date,
    touchbaselist_id: { type: ObjectId, link: "touchbaselist", index: true },
    "total_active_subscribers": Number,
    "new_active_subscribers_today": Number,
    "new_active_subscribers_yesterday": Number,
    "new_active_subscribers_this_week": Number,
    "new_active_subscribers_this_month": Number,
    "new_active_subscribers_this_year": Number,
    "total_unsubscribes": Number,
    "unsubscribes_today": Number,
    "unsubscribes_yesterday": Number,
    "unsubscribes_this_week": Number,
    "unsubscribes_this_month": Number,
    "unsubscribes_this_year": Number,
    "total_deleted": Number,
    "deleted_today": Number,
    "deleted_yesterday": Number,
    "deleted_this_week": Number,
    "deleted_this_month": Number,
    "deleted_this_year": Number,
    "total_bounces": Number,
    "bounces_today": Number,
    "bounces_yesterday": Number,
    "bounces_this_week": Number,
    "bounces_this_month": Number,
    "bounces_this_year": Number
},
{
    perms: {
        admin: "crud",
    }
});

const TouchbaseListStats = JXPSchema.model('touchbaseliststats', TouchbaseListStatsSchema);
module.exports = TouchbaseListStats;