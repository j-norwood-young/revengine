// Tracks number of interactions per day for a given reader

/* global JXPSchema */

const InteractionSchema = new JXPSchema({
    uid: { required: true, type: String, index: true, unique: true },
    day: { required: true, type: Date, index: true },
    reader_id: { required: true, type: ObjectId, link: "reader", index: true },
    insider: { type: Boolean, index: true },
    email: { type: String, index: true, trim: true, lowercase: true },
    monthly_value: Number,
    count: Number,
    count_by_service: [
        {
            service: { type: String, index: true, trim: true, lowercase: true, enum: ["web", "books", "mobile", "sailthru_transactional", "sailthru_blast", "touchbasepro", "quicket"]},
            count: Number,
        }
    ],
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