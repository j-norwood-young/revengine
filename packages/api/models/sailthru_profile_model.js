/* global JXPSchema ObjectId Mixed */

const SailthruProfileSchema = new JXPSchema({
    id: { type: String, unique: true, index: true, required: true },
    email: { type: String, unique: true, index: true, required: true },
    lists_signup: { type: Array, default: [] },
    signup_time: Date,
    var_time: Date,
    vars: Mixed,
    extid: Number,
    optout_reason: String,
    optout_time: Date,
    browser: { type: Array },
    geo: Mixed,
    create_date: Date,
    optout_type: String,
    total_opens: Number,
    total_clicks: Number,
    total_unique_opens: Number,
    total_unique_clicks: Number,
    total_pageviews: Number,
    total_messages: Number,
    last_open: Date,
    last_click: Date,
    last_pageview: Date,
    horizon_month: Mixed,
    horizon_times: Mixed,
    sailthru_last_updated: { type: Date, index: true },
},
{
    perms: {
        admin: "crud",
    }
});

const SailthruProfile = JXPSchema.model('sailthru_profile', SailthruProfileSchema);
module.exports = SailthruProfile;