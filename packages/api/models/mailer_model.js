/* global JXPSchema ObjectId Mixed */

const MailerSchema = new JXPSchema(
    {
        name: String,
        emails: [ String ],
        subject: String,
        report: String,
        cron: String,
        params: Mixed,
        last_run_start: Date,
        last_run_end: Date,
        last_run_result: Mixed,
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

// Finally, we export our model. Make sure to change the name!
const Mailer = JXPSchema.model('Mailer', MailerSchema);
module.exports = Mailer;