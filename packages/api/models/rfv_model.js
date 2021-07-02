/* global JXPSchema */

const RFVSchema = new JXPSchema({
    date: { type: Date, index: true },
    reader_id: { type: ObjectId, link: "reader", index: true },
    email: { type: String, index: true },
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
},
{
    perms: {
        admin: "crud",
        owner: "crud",
        user: "cr",
        all: ""
    }
});

RFVSchema.index({ date: 1, reader_id: 1 });
RFVSchema.index({ date: 1, email: 1 });
RFVSchema.index({ email: 1, reader_id: 1 });

const RFV = JXPSchema.model('rfv', RFVSchema);
module.exports = RFV;