/* global JXPSchema */

const WhitebeardCustomerSchema = new JXPSchema({
    userId: { type: String, index: true, unique: true },
    displayName: { type: String, index: true },
    loginName: { type: String, index: true },
    photo: String,
    country_code: Mixed,
    preferences: {
        first_name: String,
        last_name: String
    },
    country: { type: String, index: true },
    city: { type: String, index: true },
    mobile: String,
    dateOfBirth: String,
    user_type: { type: String, index: true },
    creationDate: { type: Date, index: true },
    archiveCredits: String,
    subscriptions: Mixed,
    active: String,
    clientId: Mixed,
    fields: Mixed,
    tags: [Mixed],
    segments: [Mixed],
    email_channels: [Mixed],
    push_subscriptions: [Mixed]
},
    {
        perms: {
            admin: "crud",
            owner: "crud",
            user: "r",
            all: ""
        }
    });

WhitebeardCustomerSchema.index({ user_type: 1 });
WhitebeardCustomerSchema.index({ creationDate: 1 });
WhitebeardCustomerSchema.index({ tags: 1 });
WhitebeardCustomerSchema.index({ segments: 1 });

const WhitebeardCustomer = JXPSchema.model('whitebeardcustomer', WhitebeardCustomerSchema);
module.exports = WhitebeardCustomer;

