/* global JXPSchema */

const ConfigSchema = new JXPSchema({
    key: { type: String, unique: true, index: true },
    value: Mixed
},
    {
        perms: {
            admin: "crud",
            owner: "crud",
            user: "r",
            all: ""
        }
    });

const Config = JXPSchema.model('Config', ConfigSchema);
module.exports = Config;