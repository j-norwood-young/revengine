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
    touchbasesubscriber_id: [{ type: ObjectId, link: "TouchbaseSubscriber" }],
    woocommercecustomer_id: [{ type: ObjectId, link: "WoocommerceCustomer" }],
    woocommercesubscription_id: [{ type: ObjectId, link: "WoocommerceSubscription" }],
    wordpressuser_id: [{ type: ObjectId, link: "WordpressUser" }],

    // Segments and labels
    labels: [ { type: ObjectId, link: "Label" } ],
    segment: { type: ObjectId, link: "Segment" },

    // General Data
    last_login: Date,
    last_update: Date,
    first_login: Date,
    paying_customer: Boolean,

    wordpress_id: Number,
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
    if (item.touchbasesubscriber.length) {
        let user = await TouchbaseSubscriber.findById(item.touchbasesubscriber[0]);
        if (user.name) {
            item.first_name = user.name;
        }
        let last_name = user.data.find(d => (d.Key === "[Surname]"));
        if (last_name) item.last_name = last_name.Value;
    }
    if (item.woocommercesubscription.length) {
        let user = await WoocommerceSubscription.findById(item.woocommercesubscription[0]);
        if (user.first_name) item.first_name = user.first_name;
        if (user.last_name) item.last_name = user.last_name;
    }
    if (item.woocommercecustomer.length) {
        let user = await WoocommerceCustomer.findById(item.woocommercecustomer[0]);
        if (user.first_name) item.first_name = user.first_name;
        if (user.last_name) item.last_name = user.last_name;
    }
});

// Touchbase data
ReaderSchema.pre("save", async function () {
    const item = this;
    if (!item.touchbasesubscriber.length) return;
    let tot_engagement = engagement_count = highest_engagement = 0;
    for (let subscriber_id of item.touchbasesubscriber) {
        let subscriber = await TouchbaseSubscriber.findById(subscriber_id);
        if (subscriber.email_client) item.email_client = subscriber.email_client;
        for (let d of subscriber.data) {
            if (d.Key === "[Source]") item.source = d.Value;
            if (d.Key.indexOf("Engagement]") !== -1) {
                let engagement = d.Value[0];
                if (engagement === "E") {
                    engagement_val = 1;
                } else if (engagement === "D") {
                    engagement_val = 25;
                } else if (engagement === "C") {
                    engagement_val = 50;
                } else if (engagement === "B") {
                    engagement_val = 75;
                } else if (engagement === "A") {
                    engagement_val = 90;
                }
                if (engagement_val > highest_engagement) highest_engagement = engagement_val;
                tot_engagement += engagement_val;
                engagement_count++;
            }
        }
    }
    if (engagement_count) {
        item.email_highest_engagement = highest_engagement;
        item.email_average_engagement = Math.round(tot_engagement / engagement_count);
    }
});

// const Reader 
const Reader = JXPSchema.model('reader', ReaderSchema);
module.exports = Reader;
