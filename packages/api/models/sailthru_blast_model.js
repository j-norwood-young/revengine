/* global JXPSchema ObjectId Mixed */

const SailthruBlastSchema = new JXPSchema({
    id: { type: String, unique: true, index: true, required: true },
    name: { type: String, required: true },
    template: { type: String, required: true },
    list_name: { type: String, required: true },
    day: { type: Date, required: true },
    link_params: { type: Mixed, required: true },
    sailthru_last_updated: { type: Date, index: true },
},
{
    perms: {
        admin: "crud",
    }
});

const SailthruBlast = JXPSchema.model('sailthru_blast', SailthruBlastSchema);
module.exports = SailthruBlast;