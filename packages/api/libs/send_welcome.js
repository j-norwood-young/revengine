const apihelper = require("@revengine/common/apihelper");
const Mail = require("@revengine/common/mail")
const config = require("config");

const send_welcome = async function(email) {
    const result = await apihelper.getjwt(email);
	const mail = new Mail();
	const content = `An account has been created for you on ${config.frontend.sitename}. You can log in <a href="${config.frontend.url}login/token/${result.token}">HERE</a>.`
	let mailresult = await mail.send({ to: result.email, content, subject: `${config.frontend.sitename} account created` })
	// console.log(mailresult);
}

module.exports = send_welcome;