const fs = require('fs');

const util = require('../util/botUtil');
const CommandHandler = require('../util/msgUtil');

const config = require('../config');
const { prefix } = config;
let { logMessages } = config;
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
	const keyword = 'log';
	if (!msg.content.startsWith(prefix)) return;
	if (msg.isPrivate || !util.senderIsOwner(msg)) return;
	const { channel: msgChannel, guild: msgGuild} = msg;
	const sendMessage = (s, e) => msgChannel.sendMessage(s, false, e);

	const handler = new CommandHandler(msg.content.slice((prefix + keyword).length + 1));

	const { addCommand, addCommandSentence } = handler;

	if (!whitelist[msgGuild.id]) whitelist[msgGuild.id] = [];

	addCommand('status', () => {
		if (whitelist[msgGuild.id].includes(msgChannel.id)) sendMessage('👍');
		else if (Object.keys(whitelist).includes(msgGuild.id)) sendMessage('👎');
		else sendMessage('👎 (Whole server)');
	});

	addCommand('lstc', () => {
		sendMessage(Object.keys(whitelist).includes(msgGuild.id)
			? [
				'```ini',
				...whitelist[msgGuild.id].map(i =>
					'#' + msgGuild.textChannels.find(tc =>
						tc.id === i).name),
				'```'
			].join('\n')
			: 'There are no logged channels'
		);
	});

	addCommand('start', () => {
		if (logMessages) sendMessage('Logging is already enabled');
		else {
			logMessages = true;
			sendMessage('Logging enabled');
		}
	});

	addCommand('stop', () => {
		if (!logMessages) sendMessage('Logging is already disabled');
		else {
			sendMessage('Logging disabled');
			logMessages = false;
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
 * @param {Discordie} client
 */
function logMsg (msg, client) {
	// So it changes on midnight
	const logDate = msg.createdAt.toLocaleDateString('en-US').replace(/[/\\]/g, '-');
	logFile = fs.createWriteStream('logs/chatlog-' + logDate + '.txt', {flags: 'a'});
	const possibleCommand = msg.content.startsWith(prefix);
	const logLine = getLogLine(msg.createdAt, msg, client);

	if (!msg.isPrivate) { // Guild only
		// Guild not a property
		if (whitelist.hasOwnProperty(msg.guild.id) && logMessages) {
			// Guild doesn't have channel
			if (whitelist[msg.guild.id].includes(msg.channel.id)) logToBoth(logLine);
			else if (possibleCommand) logToBoth(logLine);
		} else if (possibleCommand) logToBoth(logLine);
	}
}

/**
 * @param {Date} time 
 * @param {IMessage} msg 
 * @returns {String}
 */
function getLogLine (time, msg, client) {
	const timeString = `[${time.toLocaleDateString('en-US')} ${time.toLocaleTimeString('en-US', {hour12: true})}]`;
	const channel = `[${!msg.isPrivate ? msg.guild.name + ': #' + msg.channel.name : 'DM: ' + msg.channel.recipient.username}]`;
	const sender = `${(msg.member || msg.author).username}:`; // IUser as substitute for the case of DMs
	const attachments = !msg.attachments.length ? '' : ['', ...msg.attachments].map(a => a.url).join('\n');

	return [
		timeString,
		channel,
		sender,
		resolveMessageContent(msg.content, msg.guild, client),
		attachments
	].join(' ');
}

/**
 * Similar to `IMessage.resolveContent()` / `IMessageCollection.resolveContent(c, g?)` but:
 * 
 * - User / nickname mention: includes discriminator and id
 * - Channel and Role: indicates if channel or role
 * 
 * @param {String} content
 * @param {Discordie} client
 * @returns {String}
 */
function resolveMessageContent (content, guild, client) {
	return content.replace(/<(@!?|#|@&)([0-9]+)>/g, (match, type, id) => {
		if (type === '@' || type === '@!') { // user
			const user = client.Users.get(id);
			if (!user) return match;
			if (guild && type === '@!') {
				const member = user.memberOf(guild);
				return (member && ('@' + member.name + `#${member.discriminator}(${member.id})`)) || match;
			}
			return (user && ('@' + user.username + `(${user.id})`)) || match;
		} else if (type === '#') { // channel
			const channel = client.Channels.get(id);
			return (channel && ('#' + channel.name + '(Channel)')) || match;
		} else if (type === '@&') { // role
			if (!guild || !guild.roles) return match;
			const role = guild.roles.find(r => r.id === id);
			return (role && ('@' + role.name + '(Role)')) || match;
		}
	});
}

function init (msg, client) {
	logMsg(msg, client);
	loggerCommands(msg);
}

module.exports = {
	whitelist,
	init,
	addToLog,
	logToBoth
};
