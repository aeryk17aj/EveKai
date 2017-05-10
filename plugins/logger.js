const fs = require('fs');

const util = require('../util/botUtil');
const CommandHandler = require('../util/msgUtil');

const config = require('../config');
const whitelist = require('../whitelist');

const today = new Date(Date.now()).toLocaleDateString('en-US').replace(/[/\\]/g, '-');
let logFile = fs.createWriteStream(process.cwd() + '/logs/chatlog-' + today + '.txt', {flags: 'a'});

// Stuff that doesn't need to be inside
function addToLog (s) {
	logFile.write(s + '\n');
}

function logToBoth (s) {
	process.stdout.write(s + '\n');
	addToLog(s);
}

async function updateWhitelist () {
	fs.writeFileSync('./whitelist.json', JSON.stringify(whitelist, null, 4), 'utf-8');
}

/**
 * Commands for the chat logger
 * @param {IMessage} msg Message object
 */
function loggerCommands (msg) {
	if (!msg.content.startsWith(config.prefix)) return;
	if (msg.isPrivate || !util.senderIsOwner(msg)) return;
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
		else if (Object.keys(whitelist).includes(msgGuild.id)) sendMessage('👎');
		else sendMessage('👎 (Whole server)');
	});

	addCommand('lstc', () => {
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
					updateWhitelist().then(() => sendMessage('This channel is now being logged'));
				}
			}
		} else if (a === 'remove') {
			if (!whitelist[msgGuild.id] || !whitelist[msgGuild.id].includes(msgChannel.id)) {
				// 'Already not whitelisted' case
				return sendMessage('This channel is already not being logged');
			} else {
				// 'Remove channel' case
				whitelist[msgGuild.id].splice(whitelist[msgGuild.id].indexOf(msgChannel.id), 1);
				updateWhitelist().then(() => sendMessage('Logging of this channel has now stopped'));
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
	// So it changes on midnight
	const logDate = msg.createdAt.toLocaleDateString('en-US').replace(/[/\\]/g, '-');
	logFile = fs.createWriteStream('logs/chatlog-' + logDate + '.txt', {flags: 'a'});
	const possibleCommand = msg.content.startsWith(config.prefix);
	const logLine = getLogLine(msg.createdAt, msg);

	if (!msg.isPrivate) { // Guild only
		// Guild not a property
		if (whitelist.hasOwnProperty(msg.guild.id) && config.logMessages) {
			// Guild doesn't have channel
			if (whitelist[msg.guild.id].includes(msg.channel.id)) logToBoth(logLine);
			else if (possibleCommand) logToBoth(logLine);
		} else if (possibleCommand) logToBoth(logLine);
	}
}

function getLogLine (time, msg) {
	const timeString = `[${time.toLocaleDateString('en-US')} ${time.toLocaleTimeString('en-US', {hour12: true})}]`;
	const attachments = !msg.attachments.length ? '' : ['', ...msg.attachments].map(a => a.url).join('\n');

	return [
		timeString,
		`[${!msg.isPrivate ? msg.guild.name + ': #' + msg.channel.name : 'DM: ' + msg.channel.recipient.username}]`,
		`${(msg.member || msg.author).username}:`, // IUser as substitute for the case of DMs
		msg.content,
		attachments
	].join(' ');
}

function init (msg) {
	logMsg(msg);
	loggerCommands(msg);
}

module.exports = {
	whitelist,
	init,
	addToLog,
	logToBoth
};
