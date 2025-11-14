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
    whitebeardcustomer_id: { type: ObjectId, link: "whitebeardcustomer", index: true },

    // Segments and labels
    label_id: [{ type: ObjectId, link: "Label", map_to: "label" }],
    label_update: Date,
    segmentation_id: [{ type: ObjectId, link: "segmentation", map_to: "segment" }],
    segment_update: Date,

    // General Data
    last_login: Date,
    last_update: Date,
    first_login: Date,
    paying_customer: Boolean,

    wordpress_id: { type: Number, index: true, unique: true },
    external_id: { type: String, index: true, unique: true },
    test_wordpress_id: { type: Number, index: true }, // To be deprecated after testing

    remp_beam_id: Number,

    user_registered_on_wordpress: Date,

    member: Boolean,
    monthly_contribution: Number,

    authors: [{ type: String, index: true }],
    sections: [{ type: String, index: true }],
    authors_last_30_days: [{
        count: Number,
        name: String
    }],
    sections_last_30_days: [{
        count: Number,
        name: String
    }],
    favourite_author: String,
    favourite_section: String,

    email_state: { type: String, index: true },
    email_client: String,
    newsletters: [String],

    uas: { type: Mixed, set: toSet },

    medium: String,
    source: String,
    campaign: String,
    browser: String,
    browser_version: String,
    device: String,
    operating_system: String,
    os_version: String,
    platform: String,
    height: Number,
    width: Number,

    // Location data
    country: String,
    region: String,
    city: String,
    latitude: Number,
    longitude: Number,

    // Label Data
    label_data: Mixed,

    // Uber Code Overrides
    uber_code_override: { type: String, enum: ['send', 'withhold', 'auto'], default: "auto", index: true },

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

    app_user: { type: Boolean, index: true, default: false },
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
