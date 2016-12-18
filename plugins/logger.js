const fs = require('fs');

const botUtil = require(process.cwd() + '/util/botUtil');
const config = require(botUtil.getFromRoot('config'));
const whitelist = require(botUtil.getFromRoot('whitelist'));

const today = new Date(Date.now()).toLocaleDateString('en-US').replace(/[\/\\]/g, '-');
let logFile = fs.createWriteStream(process.cwd() + '/logs/chatlog-' + today + '.txt', {flags: 'a'});

// Stuff that doesn't need to be inside
function addToLog (s) {
	logFile.write(s + '\n');
}

function logToBoth (s) {
	console.log(s);
	addToLog(s);
}

/**
 * Commands for the chat logger
 * @param  {IMessage} msg Message object
 */
function loggerCommands (msg) {
	const msgChannel = msg.channel;
	const sendMessage = (s, e) => msgChannel.sendMessage(s, false, e);
	const msgGuild = msg.guild;
	const command = config.prefix + 'log';

	if (!msg.content.startsWith(command) || !botUtil.senderIsOwner(msg)) return;

	// if(msg.content === command) showHelp
	const args = msg.content.replace(command + ' ', '').split(' ');

	if (!(args.length > 2)) {
		switch (args[0]) {
			case 'start': case 'resume':
				if (config.logMessages) sendMessage('Logging is already enabled');
				else {
					config.logMessages = true;
					sendMessage('Logging enabled');
				} break;
			case 'stop': case 'pause':
				if (!config.logMessages) sendMessage('Logging is already disabled');
				else {
					sendMessage('Logging disabled');
					config.logMessages = false;
				} break;
			case 'whitelist':
				if (args[1] === 'add') {
					if (!whitelist.hasOwnProperty(msg.guild.id)) {
						// Create Guild + Channel case
						whitelist[msgGuild.id] = [msgChannel.id];
					} else if (!(whitelist[msgGuild.id].length)) whitelist[msgGuild.id] = [msgChannel.id];
					else {
						// Already whitelisted case
						if (whitelist[msgGuild.id].includes(msgChannel.id)) {
							sendMessage('This channel is already being logged');
							return;
						} else whitelist[msgGuild.id].push(msgChannel.id);
						// Additional Channel case
					}
					sendMessage('This channel is now being logged');
				} else if (args[1] === 'remove') {
					if (!whitelist[msgGuild.id] || !whitelist[msgGuild.id].includes(msgChannel.id)) {
						// Already not whitelisted case
						sendMessage('This channel is already not being logged');
						return;
					} else {
						// Remove channel case
						whitelist[msgGuild.id].splice(whitelist[msgGuild.id].indexOf(msgChannel.id), 1);
						sendMessage('Logging of this channel has now stopped');
					}
				} else logToBoth('Invalid whitelist argument ' + botUtil.codeL(args[1]));
				fs.writeFileSync(botUtil.getRootDir() + '/whitelist.json', JSON.stringify(whitelist, null, 4), 'utf-8');
				break;
			default:
				sendMessage('Invalid argument' + args.map(b => botUtil.codeL(b)).join(', '));
		}
	}
}

/**
 * [logMsg description]
 * @param  {IMessage} msg [description]
 * @return {void}       [description]
 */
function logMsg (msg) {
	const msgText = msg.content;
	const sender = msg.member || msg.author; // IUser as substitute for the case of DMs
	const msgChannel = msg.channel;
	const msgGuild = msg.guild;
	const timeSent = msg.createdAt;
	const timeSentString = '[' +
		timeSent.toLocaleDateString('en-US') + ' ' +
		timeSent.toLocaleTimeString('en-US', {hour12: true}) +
	']';

	// So it changes on midnight
	const logDate = timeSent.toLocaleDateString('en-US').replace(/[\/\\]/g, '-');
	logFile = fs.createWriteStream('logs/chatlog-' + logDate + '.txt', {flags: 'a'});

	// Disabling logging only disables logging of everything, detected commands will always be logged
	const possibleCommand = new RegExp('^' + config.prefix + '.+');
	if (!config.logMessages && !possibleCommand.test(msgText)) return;

	// The attachments array exists, picture or none, so length check it is
	// TODO save attachments
	const attachments = !msg.attachments.length ? '' : '\n' + msg.attachments.map(a => a.url).join('\n');

	const logLine = [
		timeSentString,
		'[' + (!msgChannel.guild ? 'DM' : msgGuild.name) + ']' +
		(!msg.isPrivate ? ' [#' + msgChannel.name + ']' : '[' + msgChannel.recipient.username + ']'),
		sender.username + ':',
		msgText,
		attachments
	].join(' ');

	// Chat Logger, AKA NSA mode
	// Whitelists to not be full-on NSA
	if (msg.isPrivate || (whitelist.hasOwnProperty(msgGuild.id) && whitelist[msgGuild.id].includes(msgChannel.id))) {
		logToBoth(logLine);
	}
}

function init (msg) {
	logMsg(msg);
	loggerCommands(msg);
}

module.exports = {
	init, addToLog, logToBoth
};
