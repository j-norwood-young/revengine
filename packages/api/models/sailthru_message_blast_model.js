/* global JXPSchema ObjectId Mixed */

const SailthruMessageBlastSchema = new JXPSchema({
    id: { type: String, unique: true, index: true, required: true },
    profile_id: { type: String, required: true, index: true },
    send_time: { type: Date, required: true, index: true },
    blast_id: { type: String, index: true },
    opens: [{ ts: Date }],
    open_time: { type: Date },
    clicks: [{ ts: Date, url: String }],
    click_time: { type: Date },
    message_id: { type: String },
    message_revenue: { type: Number },
    device: { type: String },
    delivery_status: { type: String },
    optout_time: { type: Date },
    is_real_open: { type: Boolean },
},
{
    collection: "sailthru_message_blast",
    perms: {
        admin: "crud",
    }
});

const SailthruMessageBlast = JXPSchema.model('sailthru_message_blast', SailthruMessageBlastSchema);
module.exports = SailthruMessageBlast;