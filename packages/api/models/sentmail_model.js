/* global JXPSchema */

const SentMailSchema = new JXPSchema({
    mailrun_id: { type: ObjectId, link: "mailrun" },
    reader_id: { type: ObjectId, link: "reader" },
    transactional_id: String,
    to: String,
    status: String,
    data: Mixed,
    response: Mixed,
},
{
    perms: {
        admin: "crud",
        owner: "crud",
        user: "cr",
        all: ""
    }
});

const SentMail = JXPSchema.model('sentmail', SentMailSchema);
module.exports = SentMail;