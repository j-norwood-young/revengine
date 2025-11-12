/* global JXPSchema */

const WhitebeardOrderSchema = new JXPSchema({
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

WhitebeardOrderSchema.index({ status: 1 });
WhitebeardOrderSchema.index({ activationDate: 1 });
WhitebeardOrderSchema.index({ deactivationDate: 1 });
WhitebeardOrderSchema.index({ nextRenewal: 1 });
WhitebeardOrderSchema.index({ group: 1 });
WhitebeardOrderSchema.index({ paymentMethod: 1 });

const WhitebeardOrder = JXPSchema.model('WhitebeardOrder', WhitebeardOrderSchema);
module.exports = WhitebeardOrder;

