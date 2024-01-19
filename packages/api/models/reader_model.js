/* global JXPSchema ObjectId Mixed */

const TouchbaseSubscriber = require("./touchbasesubscriber_model");
const TouchbaseList = require("./touchbaselist_model");
const WoocommerceSubscription = require("./woocommerce_subscription_model");

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

    // Segments and labels
    label_id: [ { type: ObjectId, link: "label" } ],
    label_update: Date,
    segmentation_id: [{ type: ObjectId, link: "segmentation", map_to: "segment" }],
    segment_update: Date,

    // General Data
    last_login: Date,
    last_update: Date,
    first_login: Date,
    paying_customer: Boolean,

    wordpress_id: { type: Number, index: true, unique: true },
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
    newsletters: [ String ],
    
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

    sent_insider_welcome_email: { type: Date, index: true }
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

// Trimmed lowercase email
// ReaderSchema.pre("save", function() {
//     this.email = this.email.toLowerCase().trim();
// })

// Newsletters
ReaderSchema.pre("save", async function() {
    const item = this;
    let lists = [];
    if (!item.touchbasesubscriber) {
        item.newsletters = lists;
        return;
    }
    for(touchbasesubscriber_id of item.touchbasesubscriber) {
        try {
            let tbp = await TouchbaseSubscriber.findById(touchbasesubscriber_id);
            let list = await TouchbaseList.findById(tbp.list_id);
            if (list.name !== "Daily Maverick Main List") {
                lists.push(list.name);
            } else {
                for (d of tbp.data) {
                    if (d.Key === "[DailyMaverickNewsletters]") lists.push(d.Value);
                }
            }
        } catch (err) {
            console.error(`Failed to find touchbase subscriber ${touchbasesubscriber_id}`);
        }
    }
    item.newsletters = lists;
    // await item.save();
})

// first_name and last_name
ReaderSchema.pre("save", async function () {
    const item = this;
    // wordpresslocal > woocommercecustomer > woocommercesubscription > touchbasesubscriber
    if (item.touchbasesubscriber && item.touchbasesubscriber.length) {
        let user = await TouchbaseSubscriber.findById(item.touchbasesubscriber[0]);
        if (user.name) {
            item.first_name = user.name;
        }
        let last_name = user.data.find(d => (d.Key === "[Surname]"));
        if (last_name) item.last_name = last_name.Value;
    }
    if (item.woocommercesubscription && item.woocommercesubscription.length) {
        let user = await WoocommerceSubscription.findById(item.woocommercesubscription[0]);
        if (user.first_name) item.first_name = user.first_name;
        if (user.last_name) item.last_name = user.last_name;
    }
    if (item.woocommercecustomer && item.woocommercecustomer.length) {
        let user = await WoocommerceCustomer.findById(item.woocommercecustomer[0]);
        if (user.first_name) item.first_name = user.first_name;
        if (user.last_name) item.last_name = user.last_name;
    }
});

// Touchbase data
ReaderSchema.pre("save", async function () {
    const item = this;
    if (!item.touchbasesubscriber) return;
    if (!item.touchbasesubscriber.length) return;
    for (let subscriber_id of item.touchbasesubscriber) {
        let subscriber = await TouchbaseSubscriber.findById(subscriber_id);
        if (subscriber.email_client) item.email_client = subscriber.email_client;
    }
    
});

// const Reader 
const Reader = JXPSchema.model('reader', ReaderSchema);
module.exports = Reader;
