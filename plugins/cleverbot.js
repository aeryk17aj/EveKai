// Not the actual cleverbot, under heaevy development (bot side)
// TODO: At the very least, make it usable
const apiai = require('apiai');
const util = require('../util/botUtil');
const CommandHandler = require('../util/msgUtil');

const config = require('../config');

const eve = apiai(process.env.APIAI_KEY || require('../auth').apiai);

function respond (msg, client) {
	const msgText = msg.content;
	const sender = msg.member || msg.author;
	const msgGuild = msg.guild;
	const botUser = msg.isPrivate ? client.User : client.User.memberOf(msgGuild);

	// This doesn't exist anymore for now so everything below won't work at all.
	if (!config.modules.clever) return;

	// Mention, Self, and command check
	if (sender === botUser || !msgText.startsWith(client.User.mention)) return;

	// Either no-prefix PM or mentioned in Guild
	if (msg.isPrivate === msgText.startsWith(client.User.memberOf(msgGuild).nickMention)) return;

	const actualMessage = msgText.replace(new RegExp(`^<@!?${client.User.id}> `), '');

	const request = eve.textRequest(actualMessage, {
		sessionId: sender.id // User ids are unique, might as well use those
	});

	request.on('response', res => msg.channel.sendMessage(res.result.fulfillment.speech));
	request.on('error', err => util.log(`[APIAI] [¯\\_(ツ)_/¯] ${err}`));
	request.end();
}

function cleverCommands (msg) {
	const msgChannel = msg.channel;

	const sendMessage = (s, e) => msgChannel.sendMessage(s, false, e);
	const refreshConfig = util.refreshConfig;

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

function init (msg, client) {
	respond(msg, client);
	cleverCommands(msg);
}

exports.init = init;
