/* global JXPSchema */

const MailRunSchema = new JXPSchema({
    name: String,
    code: { type: String, index: true, unique: true },
    action: String,
    data: Mixed,
    state: { type: String, enum: ['due', 'running', 'complete', 'cancelled', 'paused' ] },
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

const MailRun = JXPSchema.model('mailrun', MailRunSchema);
module.exports = MailRun;