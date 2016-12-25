// Not the actual cleverbot, under heaevy development (bot side)
const apiai = require('apiai');
const botUtil = require(process.cwd() + '/util/botUtil');
// const msgUtil = require(process.cwd() + '/util/msgUtil');
const auth = require(botUtil.getFromRoot('auth'));
const eve = apiai(auth.apiai);

/**
 * @param {IMessage} msg message object
 * @param {Discordie} name bot client
 */
function respond (msg, client) {
	const msgText = msg.content;
	const msgGuild = msg.guild;
	const sender = msg.member || msg.author;
	const botUser = msg.isPrivate ? client.User : client.User.memberOf(msgGuild);

	if (sender === botUser) return; // We don't want that even if I talk as her

	// const addCommandSentence = (c, f) => msgUtil.addCommandArgs(c, a => f(a.join(' ')));

	// Universal, mention w/o nick
	if (!msgText.startsWith(client.User.mention)) return;

	// Guild only
	if (msg.isPrivate !== msgText.startsWith(client.User.memberOf(msgGuild).nickMention)) return;
	// DM Only, No response on command
	else if (msgText.startsWith('~') && sender.id !== client.User.id) return;

	const actualMessage = msgText.replace(new RegExp(`^<@!?${client.User.id}> `), '');

	const request = eve.textRequest(actualMessage, {
		// Easy way to get something unique
		sessionId: sender.id
	});

	request.on('response', res => msg.channel.sendMessage(res.result.fulfillment.speech));
	request.on('error', err => console.log(`[APIAI] [¯\\_(ツ)_/¯] ${err}`));
	request.end();
}

module.exports = {
	respond
};