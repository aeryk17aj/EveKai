const fs = require('fs');

const botUtil = require('../util/botUtil');
const CommandHandler = require('../util/msgUtil');

const config = require('../config');
const whitelist = require('../whitelist');

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

function updateWhitelist () {
	fs.writeFileSync('../whitelist.json', JSON.stringify(whitelist, null, 4), 'utf-8');
}

/**
 * Commands for the chat logger
 * @param {IMessage} msg Message object
 */
function loggerCommands (msg) {
	if (msg.isPrivate) return;
	if (!botUtil.senderIsOwner(msg)) return;
	const msgChannel = msg.channel;
	const sendMessage = (s, e) => msgChannel.sendMessage(s, false, e);
	const msgGuild = msg.guild;
	const command = msg.content.slice((config.prefix + 'log ').length);

	const handler = new CommandHandler(command);

	const addCommand = (c, f) => handler.addCommand(c, f);
	const addCommandSentence = (c, f) => handler.addCommandSentence(c, f);

	if (!whitelist[msgGuild.id]) whitelist[msgGuild.id] = [];

	addCommand('status', () => {
		if (whitelist[msgGuild.id].includes(msgChannel.id)) sendMessage('👍');
		else sendMessage('👎');
	});

	addCommand('lswlc', () => {
		sendMessage([
			'```ini',
			...whitelist[msgGuild.id]
				.map(i => 
					'#' + msgGuild.textChannels
						.find(tc => 
							tc.id === i).name),
			'```'
		].join('\n'));
	});

	addCommand('start', () => {
		if (config.logMessages) sendMessage('Logging is already enabled');
		else {
			config.logMessages = true;
			sendMessage('Logging enabled');
		}
	});

	addCommand('stop', () => {
		if (!config.logMessages) sendMessage('Logging is already disabled');
		else {
			sendMessage('Logging disabled');
			config.logMessages = false;
		}
	});

	addCommandSentence('whitelist', a => {
		if (a === 'add') {
			if (!whitelist[msgGuild.id].length) {
				// 'Create Guild + Channel' case
				whitelist[msgGuild.id] = [msgChannel.id];
			} else {
				// 'Already whitelisted' case
				if (whitelist[msgGuild.id].includes(msgChannel.id)) return sendMessage('This channel is already being logged');
				// 'Additional Channel' case
				else {
					whitelist[msgGuild.id].push(msgChannel.id);
					updateWhitelist();
					sendMessage('This channel is now being logged');
				}
			}
			
		} else if (a === 'remove') {
			if (!whitelist[msgGuild.id] || !whitelist[msgGuild.id].includes(msgChannel.id)) {
				// 'Already not whitelisted' case
				return sendMessage('This channel is already not being logged');
			} else {
				// 'Remove channel' case
				whitelist[msgGuild.id].splice(whitelist[msgGuild.id].indexOf(msgChannel.id), 1);
				sendMessage('Logging of this channel has now stopped').then(() => updateWhitelist());
			}
		}
	});
}

/**
 * Logs every whitelisted channel's messages to a single file.
 * Considering on having multiple files separated by folders named by the day
 * @param {IMessage} msg Message object
 */
function logMsg (msg) {
	const msgChannel = msg.channel;
	const timeSent = msg.createdAt;
	const timeSentString = '[' +
		timeSent.toLocaleDateString('en-US') + ' ' +
		timeSent.toLocaleTimeString('en-US', {hour12: true}) +
	']';

	// So it changes on midnight
	const logDate = timeSent.toLocaleDateString('en-US').replace(/[\/\\]/g, '-');
	logFile = fs.createWriteStream('logs/chatlog-' + logDate + '.txt', {flags: 'a'});

	const possibleCommand = msg.content.startsWith(config.prefix);

	// The attachments array exists, picture or none, so length check it is
	const attachments = !msg.attachments.length ? '' : ['', ...msg.attachments].map(a => a.url).join('\n');

	const logLine = [
		timeSentString,
		`[${!msg.isPrivate ? msg.guild.name + ': #' + msgChannel.name : 'DM: ' + msgChannel.recipient.username}]`,
		`${(msg.member || msg.author).username}:`, // IUser as substitute for the case of DMs
		msg.content,
		attachments
	].join(' ');

	if (!msg.isPrivate) { // Guild only
		// Guild not a property
		if (whitelist.hasOwnProperty(msg.guild.id) && config.logMessages) {
			// Guild doesn't have channel
			if (whitelist[msg.guild.id].includes(msgChannel.id)) logToBoth(logLine);
			else return;
		} else if (possibleCommand) logToBoth(msg);
	}

}

function init (msg) {
	logMsg(msg);
	loggerCommands(msg);
}

module.exports = {
	whitelist,
	init, addToLog, logToBoth
};
