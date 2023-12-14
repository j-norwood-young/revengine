/* global JXPSchema ObjectId Mixed */

const SailthruUserSchema = new JXPSchema({
    id: { type: String, unique: true },
    email: { type: String, unique: true },
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
    horizon_times: Mixed
},
{
    perms: {
        admin: "crud",
    }
});

const SailthruUser = JXPSchema.model('sailthruuser', SailthruUserSchema);
module.exports = SailthruUser;