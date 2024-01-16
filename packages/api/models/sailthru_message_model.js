/* global JXPSchema ObjectId Mixed */

const SailthruMessageSchema = new JXPSchema({
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
    sailthru_last_updated: { type: Date, index: true },
},
{
    perms: {
        admin: "crud",
    }
});

const SailthruMessage = JXPSchema.model('sailthru_message', SailthruMessageSchema);
module.exports = SailthruMessage;