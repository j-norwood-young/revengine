/* global JXPSchema */

const QuicketSchema = new JXPSchema({
    reader_id: { type: ObjectId, link: "reader", index: true },
    email: { type: String, index: true },
    cellphone: { type: String, index: true },
    first_name: String,
    surname: String,
    order_id: { type: Number, index: true },
    ticket_id: { type: Number, index: true, unique: true },
    barcode: { type: Number, index: true },
    date_added: { type: Date, index: true },
    ticket_type: String,
    ticket_type_id: Number,
    seat_number: String,
    discount_code: String,
    discount_amount: Number,
    checked_in: String,
    checkin_date: String,
    checked_in_by: String,
    complimentary: String,
    price: Number,
    amount_paid: Number,
    valid: Boolean,
    transferred_to_order_id: String,
    frozen: Boolean,
    payment_method: String,
    event_date: Date,
},
{
    perms: {
        admin: "crud",
        owner: "crud",
        user: "cr"
    }
});

const Quicket = JXPSchema.model('quicket', QuicketSchema);
module.exports = Quicket;