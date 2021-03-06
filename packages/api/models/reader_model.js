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

    // Links to related collections
    // touchbasesubscriber_id: [{ type: ObjectId, link: "touchbasesubscriber" }],
    // woocommercecustomer_id: [{ type: ObjectId, link: "WoocommerceCustomer" }],
    // woocommercesubscription_id: [{ type: ObjectId, link: "WoocommerceSubscription" }],
    wordpressuser_id: { type: ObjectId, link: "wordpressuser" },

    // Segments and labels
    labels: [ { type: ObjectId, link: "label" } ],
    // segment: { type: ObjectId, link: "segment" },

    // General Data
    last_login: Date,
    last_update: Date,
    first_login: Date,
    paying_customer: Boolean,

    wordpress_id: { type: Number, index: true },
    remp_beam_id: Number,
    
    member: Boolean,
    monthly_contribution: Number,

    recency_score: { type: Number, index: true },
    recency: Date,
    frequency_score: { type: Number, index: true },
    frequency: Number,
    monetary_value_score: { type: Number, index: true },
    monetary_value: Number, // per month
    volume_score: { type: Number, index: true },
    volume: Number,
    total_lifetime_value_score: { type: Number, index: true },
    total_lifetime_value: Number,
    
    authors: [{ type: String, index: true }],
    sections: [{ type: String, index: true }],
    favourite_author: String,
    favourite_section: String,
    
    email_state: { type: String, index: true },
    email_client: String,
    newsletters: [ String ],
    
    uas: { type: Mixed, set: toSet },

    medium: String,
    source: String,
    browser: String,
    browser_version: String,
    device: String,
    operating_system: String,
    os_version: String,
    platform: String,
    height: Number,
    width: Number,

    // Label Data
    label_data: [Mixed],
    
    _owner_id: ObjectId
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
ReaderSchema.pre("save", function() {
    this.email = this.email.toLowerCase().trim();
})

// Newsletters
ReaderSchema.pre("save", async function() {
    const item = this;
    let lists = [];
    if (!item.touchbasesubscriber) {
        item.newsletters = lists;
        return;
    }
    for(touchbasesubscriber_id of item.touchbasesubscriber) {
        let tbp = await TouchbaseSubscriber.findById(touchbasesubscriber_id);
        let list = await TouchbaseList.findById(tbp.list_id);
        if (list.name !== "Daily Maverick Main List") {
            lists.push(list.name);
        } else {
            for (d of tbp.data) {
                if (d.Key === "[DailyMaverickNewsletters]") lists.push(d.Value);
            }
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
