const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Schema.Types.ObjectId;
const Mixed = mongoose.Schema.Types.Mixed;

const Label = require("./label_model");
const Segment = require("./segment_model");
const TouchbaseSubscriber = require("./touchbasesubscriber_model");
const TouchbaseList = require("./touchbaselist_model");
const WoocommerceCustomer = require("./woocommercecustomer_model");
const WoocommerceSubscription = require("./woocommercesubscription_model");
const WordpressUser = require("./wordpressuser_model");
const Rempuserhit = require("./rempuserhit_model");

const ReaderSchema = new Schema({
    email: { type: String, index: true, unique: true, lowercase: true, trim: true },
    first_name: { type: String, trim: true },
    last_name: { type: String, trim: true },
    touchbasesubscriber: [{ type: ObjectId, ref: "TouchbaseSubscriber" }],
    woocommercecustomer: [{ type: ObjectId, ref: "WoocommerceCustomer" }],
    woocommercesubscription: [{ type: ObjectId, ref: "WoocommerceSubscription" }],
    wordpressuser: [{ type: ObjectId, ref: "WordpressUser" }],
    rempuserhit: [{ type: ObjectId, ref: "Rempuserhit" }],
    wordpress_id: Number,
    wordpress_roles: [ String ],
    remp_crm_id: Number,
    remp_beam_id: Number,
    remp_beam_token: String,

    remp_30day_article_progress_avg: Number,
    remp_30day_article_timespent_avg: Number,
    remp_30day_article_timespent_tot: Number,
    remp_30day_article_hits_count: Number,
    remp_30day_top_campaign: [String],
    remp_30day_top_referer: [String],
    remp_30day_top_user_agent: [String],
    remp_30day_top_utm_medium: [String],
    remp_30day_top_utm_source: [String],
    remp_30day_top_utm_campaign: [String],
    remp_30day_top_device: [String],
    remp_30day_top_os: [String],
    remp_30day_top_os_version: [String],
    remp_30day_top_platform: [String],
    remp_30day_top_author: [String],
    remp_30day_authors: Mixed,
    remp_30day_hits: Mixed,
    remp_30day_referers: Mixed,
    remp_30day_utm_sources: Mixed,
    remp_30day_device_count: Number,

    labels: [ { type: ObjectId, ref: "Label" } ],
    segment: { type: ObjectId, ref: "Segment" },
    last_visit: Date,
    number_of_visits: Number,
    maverick_insider: Boolean,
    monthly_contribution: Number,
    date_created: Date,
    email_state: { type: String, index: true },
    email_client: String,
    email_highest_engagement: Number,
    email_average_engagement: Number,
    newsletters: [ String ],
    touchbase_data: [ Mixed ],
    membership_status: String,
    membership_start_date: Date,
    membership_value: Number,
    membership_value_per_month: Number,
    membership_period: String,
    next_payment_date: Date,
    last_payment_date: Date,
    membership_product: String,
    membership_created_via: String,
    payment_method: String,
    woocommerce_order_id: Number,
    woocommerce_subscription_id: Number,
    woocommerce_product: String,
    visit_count: Number,
    favourite_author: String,
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
    campaign: String,
    last_sync_touchbase: Date,
    _owner_id: ObjectId
},
{
    toObject: {
        virtuals: true
    },
    toJSON: {
        virtuals: true
    },
    timestamps: true,
    writeConcern: {
        w: 'majority',
        j: true,
        wtimeout: 1000
    },
});

// We can set permissions for different user types and user groups
ReaderSchema.set("_perms", {
    admin: "crud", // CRUD = Create, Retrieve, Update and Delete
    owner: "crud",
    user: "r",
});

// Lowercase email
ReaderSchema.pre("save", function() {
    this.email = this.email.toLowerCase();
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
    if (item.wordpressuser.length) {
        let user = await WordpressUser.findById(item.wordpressuser[0]);
        if (!user) continue;
        if (user.first_name) item.first_name = user.first_name;
        if (user.last_name) item.last_name = user.last_name;
    }
    // await item.save();
});

// Wordpress data
ReaderSchema.pre("save", async function () {
    const item = this;
    if (!item.wordpressuser.length) return;
    for (let wordpressuser_id of item.wordpressuser) {
        let user = await WordpressUser.findById(wordpressuser_id);
        if (!user) continue;
        item.date_created = user.date_created;
        item.wordpress_id = user.id;
        item.wordpress_roles = user.roles;
    }
})

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
module.exports = Reader = mongoose.model('Reader', ReaderSchema)
