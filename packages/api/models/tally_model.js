/* global JXPSchema */

const TallySchema = new JXPSchema({
    reader_id: { type: ObjectId, link: "reader", index: true },
    responseId: { type: String, index: true, unique: true },
    respondentId: { type: String, index: true },
    formName: { type: String, index: true },
    submittedAt: { type: Date, index: true },
    answers: [{
        question: String,
        answer: String
    }]
},
    {
        perms: {
            admin: "crud",
            owner: "crud",
            user: "cr"
        }
    });

const Tally = JXPSchema.model('tally', TallySchema);
module.exports = Tally;
