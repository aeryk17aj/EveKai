const botUtil = require(process.cwd() + '/util/botUtil');
const logger = require(botUtil.getPlugin('logger'));

const config = require(botUtil.getFromRoot('config'));
const ballQuotes = require(botUtil.getQuotes('8ball'));
const leaveQuotes = require(botUtil.getQuotes('disconnect'));

/**
 * Primary message listener
 * @param  IMessage  msg    Message object to be used
 * @param  Discordie client Bot client object
 */
function respond (msg, client) {
	const msgText = msg.content;
	const sender = msg.member || msg.author; // IUser as a substitute for DMs
	const msgChannel = msg.channel;
	// const msgGuild = msg.guild;
	// Used in Cleverbot, not here, but just in case
	// var botUser = msg.isPrivate ? client.User : client.User.memberOf(msgGuild);

	const sendMessage = (s, e) => msgChannel.sendMessage(s, false, e);
	const sendEmbed = (e) => sendMessage('', e);

	const addCommand = (c, f) => addCmd(msgText, c, f);
	const addCommandResponse = (c, r) => addCommand(c, () => sendMessage(r));
	const addCommandArgs = (c, f) => addCmdArgs(msgText, c, f);
	const addCommandSentence = (c, f) => addCommandArgs(c, a => f(a.join(' ')));

	addCommand('dc', () => {
		if (!botUtil.senderIsOwner(msg)) return;
		sendMessage(botUtil.rInAr(leaveQuotes));
		logger.logToBoth('[System] System Disconnected (command)');
		setTimeout(() => {
			client.disconnect();
			process.exit();
		}, 2000);
	});

	addCommandResponse('info', 'Running on 2.0.0-1.');
	addCommandResponse('v2?', 'Yep, Eve is being split into (still connected) parts instead of being one big file.');
	addCommandResponse('builtOn', botUtil.codeL(client.User.username) + ' is currently running on under `Discordie 0.10.0` (Node.js)');
	addCommandResponse('connections', botUtil.codeL(client.User.username) + ' is connected to ' + botUtil.codeL(client.Guilds.length) + ' servers.');
	addCommandResponse('docs', 'http://qeled.github.io/discordie/#/docs/Discordie?_k=grrhaj');
	addCommandSentence('docs', a => {
		switch (a) {
			case 'discord':
				sendMessage('https://discordapp.com/developers/docs/intro'); return;
			case 'discord.js': case 'd.js':
				sendMessage('https://discord.js.org/#/docs/main/master/general/welcome'); return;
			case 'discordie':
				sendMessage('https://qeled.github.io/discordie/#/docs/Discordie?_k=grrhaj'); break;
			case 'osu':
				sendMessage('https://github.com/ppy/osu-api/wiki'); break;
			default:
				sendMessage('I don\'t have a link for ' + botUtil.codeL(a));
		}
	});

	// This is where the fun starts
	addCommandSentence('8ball', a => {
		if (/\?$/.test(a)) {
			sendEmbed({
				color: 0xFFB2C5,
				author: {
					name: (sender.nickname || sender.name),
					icon_url: sender.avatarURL
				},
				title: a,
				description: 'Answer: ' + botUtil.rInAr(ballQuotes)
			});
		} else sendMessage('Use a question mark.');
	});
}

function addCmd (msg, c, f) {
	if (msg === config.prefix + c) f();
}

function addCmdArgs (msg, c, f) {
	const args = msg.replace(new RegExp(`^${c} .+`), '').split(' ');
	if (msg.startsWith(config.prefix + c)) f(args);
}

// exports.respond = respond;
module.exports = {
	// General, used in main file
	respond,
	// Utility, used in other plugins
	addCmd, addCmdArgs
};
