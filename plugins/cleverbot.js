// Not the actual cleverbot, under heaevy development (bot side)
const apiai = require('apiai');
const botUtil = require(process.cwd() + '/util/botUtil');
// const msgUtil = require(process.cwd() + '/util/msgUtil');
const auth = require(botUtil.getFromRoot('auth'));
const eve = apiai(auth.apiai);

function respond (msg, client) {
	const msgText = msg.content;
	const msgGuild = msg.guild;
	const sender = msg.member || msg.author;

	// const addCommandSentence = (c, f) => msgUtil.addCommandArgs(c, a => f(a.join(' ')));

	if (!msgText.startsWith(client.User.mention)) return;
	if (!msg.isPrivate && !msgText.startsWith(client.User.memberOf(msgGuild).nickMention)) return;
	else if (msgText.startsWith('~') && sender.id !== client.User.id) return;

	const request = eve.textRequest(msgText, {
		// Easy way to get something unique
		sessionId: sender.id
	});

	request.on('response', res => {
		msg.channel.sendMessage(res);
	});

	request.on('error', err => {
		console.log(`[APIAI] ¯\\_(ツ)_/¯ | ${err}`);
	});
}

module.exports = {
	respond
};