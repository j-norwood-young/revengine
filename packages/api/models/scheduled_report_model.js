/* global JXPSchema ObjectId Mixed */

const Scheduled_ReportSchema = new JXPSchema({
    "user_id": { type: ObjectId, link: "user" },
    "name": String,
    "start_date": Date,
    "end_date": Date,
    "settings": Mixed,
    "emails": [ String ],
    "period": String,
    "time": [ String ],
    "day": [ String ],
    "date": [ String ],
},
    {
        perms: {
            admin: "crud", // CRUD = Create, Retrieve, Update and Delete
            owner: "crud",
            user: "r",
            all: ""
        }
    });

const Scheduled_Report = JXPSchema.model('Scheduled_Report', Scheduled_ReportSchema);
module.exports = Scheduled_Report;