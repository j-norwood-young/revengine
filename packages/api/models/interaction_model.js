// Tracks number of interactions per day for a given reader

/* global JXPSchema */

const InteractionSchema = new JXPSchema({
    uid: { required: true, type: String, index: true, unique: true },
    day: { required: true, type: Date, index: true },
    reader_id: { required: true, type: ObjectId, link: "reader", index: true },
    insider: { type: Boolean, index: true },
    email: { type: String, index: true, trim: true, lowercase: true },
    monthly_value: { type: Number, index: true },
    lifetime_value: { type: Number, index: true },
    first_payment: { type: Date, index: true },
    last_payment: { type: Date, index: true },
    date_paid: { type: Date, index: true },
    count: { type: Number, index: true },
    web_count: { type: Number, index: true },
    books_count: { type: Number, index: true },
    mobile_count: { type: Number, index: true },
    sailthru_transactional_open_count: { type: Number, index: true },
    sailthru_transactional_click_count: { type: Number, index: true },
    sailthru_blast_open_count: { type: Number, index: true },
    sailthru_blast_click_count: { type: Number, index: true },
    touchbasepro_open_count: { type: Number, index: true },
    touchbasepro_click_count: { type: Number, index: true },
    quicket_count: { type: Number, index: true },
},
{
    perms: {
        admin: "crud",
        owner: "crud",
        user: "cr",
        all: ""
    }
});

InteractionSchema.index({ day: 1, email: 1 }, { unique: true });

const Interaction = JXPSchema.model('interaction', InteractionSchema);
module.exports = Interaction;