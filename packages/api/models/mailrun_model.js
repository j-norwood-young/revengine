/* global JXPSchema */

const MailRunSchema = new JXPSchema({
    name: String,
    code: { type: String, index: true, unique: true },
    data: Mixed,
    queued_reader_ids: [{ type: ObjectId, link: "reader", map_to: "queued" }],
    sent_reader_ids: [{ type: ObjectId, link: "reader", map_to: "sent" }],
    failed_reader_ids: [{ type: ObjectId, link: "reader", map_to: "sent" }],
    touchbasetransactional_id: { type: ObjectId, link: "touchbasetransactional" },
    state: { type: String, enum: ['due', 'running', 'complete', 'cancelled', 'paused', 'failed' ] },
    start_time: { type: Date, default: new Date() },
    end_time: Date,
},
{
    perms: {
        admin: "crud",
        owner: "crud",
        user: "cr",
        all: ""
    }
});

MailRunSchema.statics.move_to_sent = async function(data) {
    try {
        const reader_id = data.reader_id;
        const mailrun_id = data.mailrun_id;
        await MailRun.updateOne({ "_id": mailrun_id }, { $pull: { "queued_reader_ids": reader_id } });
        await MailRun.updateOne({ "_id": mailrun_id }, { $push: { "sent_reader_ids": reader_id } });
        return true;
    } catch (err) {
        console.error(err);
        return "An error occured";
    }
}

MailRunSchema.statics.move_to_failed = async function(data) {
    try {
        const reader_id = data.reader_id;
        const mailrun_id = data.mailrun_id;
        await MailRun.updateOne({ "_id": mailrun_id }, { $pull: { "queued_reader_ids": reader_id } });
        await MailRun.updateOne({ "_id": mailrun_id }, { $push: { "failed_reader_ids": reader_id } });
        return true;
    } catch (err) {
        console.error(err);
        return "An error occured";
    }
}

const MailRun = JXPSchema.model('mailrun', MailRunSchema);
module.exports = MailRun;