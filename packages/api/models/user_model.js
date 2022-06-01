/* global JXPSchema */
var friendly = require("mongoose-friendly");
const send_welcome = require("@revengine/api/libs/send_welcome");

var UserSchema = new JXPSchema({
	name: { type: String },
	urlid: { type: String, unique: true, index: true },
	email: { type: String, unique: true, index: true, set: toLower },
	password: String,
	admin: Boolean,
	temp_hash: String,
},
{
	perms: {
		admin: "crud",
		owner: "cru",
		user: "r",
		member: "r",
		api: "r"
	}
});

UserSchema.path('name').validate(function (v) {
	return (v) && (v.length > 0);
}, 'Name cannot be empty');

UserSchema.plugin(friendly, {
	source: 'name',
	friendly: 'urlid'
});

function toLower (v) {
	if (v)
		return v.toLowerCase();
	return null;
}

UserSchema.pre('save', function (next) {
    this.wasNew = this.isNew;
    next();
})

// Ensure _owner_id is always the user_id
UserSchema.pre('save', function (next) {
	this._owner_id = this._id;
	next();
});

UserSchema.post("save", async function(doc) {
	if (!this.wasNew) return;
	await send_welcome(doc.email);
})

const UserModel = JXPSchema.model('User', UserSchema);
module.exports = UserModel;