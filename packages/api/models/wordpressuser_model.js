/* global JXPSchema ObjectId Mixed */

const WordpressUserSchema = new JXPSchema({
    id: { type: Number, index: true }, 
    "user_login": String,
    "user_pass": String,
    "user_nicename": String,
    "user_email": { type: String, unique: true, index: true },
    "user_url": String,
    "user_registered": Date,
    "display_name": String,
    "nickname": String,
    "first_name": String,
    "last_name": String,
    "description": String,
    "wp_capabilities": Mixed,
    "wp_user_level": Number,
    "rs_saved_for_later": Mixed,
    "current_login": Date,
    "last_login": Date,
    "dm-status-user": Number,
    "gender": String,
    // "user_dob": String,
    "user_industry": String,
    "session_tokens": Mixed,
    "wsl_current_provider": String,
    "wsl_current_user_image": String,
    "user_facebook": String,
    "user_twitter": String,
    "user_linkedin": String,
    "googleplus": String,
    "twitter": String,
    "facebook": String,
    "wc_last_active": Date,
    "dm-ad-free-interacted": Boolean,
    "dm-ad-free-toggle": Boolean,
    "last_update": Date,
    "paying_customer": Boolean,
    "billing_phone": String,
    "cc_expiry_date": Date,
    "cc_last4_digits": String,
    "_dm_campaign_created_by_utm_source": String,
    "_dm_campaign_created_by_utm_medium": String,
    "_dm_campaign_created_by_utm_campaign": String,
},
{
    perms: {
        admin: "crud", // CRUD = Create, Retrieve, Update and Delete
        owner: "crud",
        user: "r",
        all: "" // Unauthenticated users will be able to read from WordpressUser, but that is all
    }
});

const WordpressUser = JXPSchema.model('wordpressuser', WordpressUserSchema);
module.exports = WordpressUser;