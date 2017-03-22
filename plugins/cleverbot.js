// Not the actual cleverbot, under heaevy development (bot side)
const apiai = require('apiai');
const Cleverbot = require('cleverbot-node');

const botUtil = require(process.cwd() + '/util/botUtil');
const msgUtil = require(process.cwd() + '/util/msgUtil');
const CommandHandler = require('../util/msgUtil');

const config = require(botUtil.getFromRoot('config'));

const eve = apiai(process.env.APIAI_KEY || require('../auth').apiai);
const cleverbot = new Cleverbot();

/**
 * @param {IMessage} msg message object
 * @param {Discordie} name bot client
 */
function respond (msg, client) {
	const msgText = msg.content;
	const sender = msg.member || msg.author;
	const msgGuild = msg.guild;
	const botUser = msg.isPrivate ? client.User : client.User.memberOf(msgGuild);

	if (!config.modules.clever) return;

	// Mention, Self, and command check
	if (sender === botUser || !msgText.startsWith(client.User.mention)) return;

	// Either no-prefix PM or mentioned in Guild
	if (msg.isPrivate === msgText.startsWith(client.User.memberOf(msgGuild).nickMention)) return;

	const actualMessage = msgText.replace(new RegExp(`^<@!?${client.User.id}> `), '');

	if (!config.oldClever) {
		const request = eve.textRequest(actualMessage, {
			sessionId: sender.id // User ids are unique, might as well use those
		});

		request.on('response', res => msg.channel.sendMessage(res.result.fulfillment.speech));
		request.on('error', err => console.log(`[APIAI] [¯\\_(ツ)_/¯] ${err}`));
		request.end();
	} else {
		// Fallback - dumb, but packed Cleverbot
		cleverbot.write(actualMessage, res => msg.channel.sendMessage(res.message));
	}
}

/**
 * @param {IMessage} msg message object
 */
function cleverCommands (msg) {
	const msgChannel = msg.channel;

	const sendMessage = (s, e) => msgChannel.sendMessage(s, false, e);
	const refreshConfig = () => msgUtil.refreshConfig();

	const command = msg.content.slice(config.prefix.length);
	const handler = new CommandHandler(command);

	const addCommand = (c, f) => handler.addCommand(c, f);
	const addCommandResponse = (c, r) => addCommand(c, () => sendMessage(r));

	addCommand('tC', () => {
		config.modules.clever = !config.modules.clever;
		refreshConfig();
	});

	addCommandResponse('isClever',
		config.modules.clever
		? 'Yup'
		: 'Nope'
	);

	addCommand('oldClever', () => {
		if (config.oldClever) return;
		else config.oldClever = true;
		refreshConfig();
	});

	addCommand('newClever', () => {
		if (!config.oldClever) return;
		else config.oldClever = false;
		refreshConfig();
	});
}

/**
 * @param {IMessage} msg message object
 * @param {Discordie} name bot client
 */
function init (msg, client) {
	respond(msg, client);
	cleverCommands(msg);
}

module.exports = {
	init
};
