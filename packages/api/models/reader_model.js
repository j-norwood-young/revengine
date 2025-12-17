/* global JXPSchema ObjectId Mixed */

const ReaderSchema = new JXPSchema({
    // Basics
    email: { type: String, index: true, unique: true, lowercase: true, trim: true, sparse: true },
    display_name: String,
    first_name: { type: String, trim: true },
    last_name: { type: String, trim: true },
    cellphone: { type: String, trim: true },

    // Links to related collections
    // touchbasesubscriber_id: [{ type: ObjectId, link: "touchbasesubscriber" }],
    // woocommercecustomer_id: [{ type: ObjectId, link: "WoocommerceCustomer" }],
    // woocommercesubscription_id: [{ type: ObjectId, link: "WoocommerceSubscription" }],
    wordpressuser_id: { type: ObjectId, link: "wordpressuser", index: true },
    whitebeardcustomer_id: { type: ObjectId, link: "whitebeard_customer", index: true },

    // Segments and labels
    label_id: [{ type: ObjectId, link: "Label", map_to: "label" }],
    label_update: Date,
    segmentation_id: [{ type: ObjectId, link: "segmentation", map_to: "segment" }],
    segment_update: Date,
    label_data: Mixed,
    // Segment v2 (condition-based)
    segment_id: [{ type: ObjectId, link: "segment", map_to: "segment_v2" }],
    segment_update_v2: Date,

    // Dates
    last_login: Date,
    last_update: Date,
    first_login: Date,
    user_registered: { type: Date, index: true, default: Date.now },

    // Commmercial relationship
    paying_customer: { type: Boolean, index: true, default: false },
    payment_method: String,
    member: { type: Boolean, index: true, default: false },
    monthly_contribution: { type: Number, index: true, default: 0 },
    subscription_total: { type: Number, index: true, default: 0 },
    subscription_product: String,
    subscription_period: String,
    subscription_status: String,
    subscription_next_payment: Date,
    subscription_start: Date,
    subscription_end: Date,
    subscription_cancellation_request_date: Date,
    subscription_cancellation_reason: String,

    // External IDs
    wordpress_id: { type: Number, index: true, unique: true },
    external_id: { type: Number, index: true, unique: true },

    user_registered_on_wordpress: Date,

    // Content preferences
    authors: [{ type: String, index: true }],
    sections: [{ type: String, index: true }],
    
    favourite_author: String,
    favourite_section: String,

    email_state: { type: String, index: true },
    email_client: String,
    newsletters: [String],

    // User Agent
    app_user: { type: Boolean, index: true, default: false },
    uas: { type: Mixed, set: toSet },
    browser: String,
    browser_version: String,
    device: String,
    operating_system: String,
    os_version: String,
    platform: String,
    height: Number,
    width: Number,

    // UTM parameters
    medium: String,
    source: String,
    campaign: String,

    // Location data
    country: String,
    region: String,
    city: String,
    latitude: Number,
    longitude: Number,

    // Credit Cards
    cc_expiry_date: Date,
    cc_last4_digits: String,

    //RFV
    recency_score: { type: Number, index: true },
    recency: Date,
    recency_quantile_rank: Number,
    frequency_score: { type: Number, index: true },
    frequency: Number,
    frequency_quantile_rank: Number,
    monetary_value_score: { type: Number, index: true },
    monetary_value: Number, // per month
    volume_score: { type: Number, index: true },
    volume: Number,
    volume_quantile_rank: Number,
    total_lifetime_value_score: { type: Number, index: true },
    total_lifetime_value: Number,

    sent_insider_welcome_email: { type: Date, index: true },
},
    {
        perms: {
            admin: "crud",
            owner: "crud",
            user: "r",
        }
    });

function toSet(a) {
    return [...new Set(a)];
}


// const Reader 
const Reader = JXPSchema.model('reader', ReaderSchema);
module.exports = Reader;
