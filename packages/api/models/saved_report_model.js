/* global JXPSchema ObjectId Mixed */

const Saved_ReportSchema = new JXPSchema({
    "user_id": { type: ObjectId, link: "user" },
    "name": String,
    "start_date": Date,
    "end_date": Date,
    "settings": Mixed,
    "emails": [ String ],
},
    {
        perms: {
            admin: "crud", // CRUD = Create, Retrieve, Update and Delete
            owner: "crud",
            user: "r",
            all: ""
        }
    });

const Saved_Report = JXPSchema.model('Saved_Report', Saved_ReportSchema);
module.exports = Saved_Report;