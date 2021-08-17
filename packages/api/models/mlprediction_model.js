/* global JXPSchema ObjectId Mixed */

const MLPredictionSchema = new JXPSchema(
    {
        date: { type: Date, index: true, required: true },
        reader_id: { type: ObjectId, link: "reader", index: true, required: true },
        score: { type: Number, required: true },
        prediction: { type: Boolean, index: true, required: true }
    },
    {
        perms: {
            admin: "crud",
            owner: "crud",
            user: "r",
            all: ""
        }
    }
);

MLPredictionSchema.index({
    date: 1,
    reader_id: 1
}, { "unique": true });

// Finally, we export our model. Make sure to change the name!
const MLPrediction = JXPSchema.model('MLPrediction', MLPredictionSchema);
module.exports = MLPrediction;