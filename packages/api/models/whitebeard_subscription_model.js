/* global JXPSchema */

const WhitebeardSubscriptionSchema = new JXPSchema({
    id: { type: String, index: true, unique: true },
    activationDate: { type: Date, index: true },
    deactivationDate: { type: Date, index: true },
    status: { type: String, index: true },
    purchased_item: Mixed,
    nextRenewal: { type: Date, index: true },
    lastFailedOrder: Mixed,
    attempts: String,
    referenceOrderId: { type: String, index: true },
    group: { type: String, index: true },
    group_name: String,
    paymentMethod: { type: String, index: true },
    cancellationRequestDate: Date,
    cancellationReason: String,
    currency: { type: String, index: true }
},
    {
        perms: {
            admin: "crud",
            owner: "crud",
            user: "r",
            all: ""
        }
    });

WhitebeardSubscriptionSchema.index({ status: 1 });
WhitebeardSubscriptionSchema.index({ activationDate: 1 });
WhitebeardSubscriptionSchema.index({ deactivationDate: 1 });
WhitebeardSubscriptionSchema.index({ nextRenewal: 1 });
WhitebeardSubscriptionSchema.index({ group: 1 });
WhitebeardSubscriptionSchema.index({ paymentMethod: 1 });

const WhitebeardSubscription = JXPSchema.model('WhitebeardSubscription', WhitebeardSubscriptionSchema);
module.exports = WhitebeardSubscription;

