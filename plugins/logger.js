const fs = require('fs');

const { refreshConfig, senderIsOwner } = require('../util/botUtil');
const CommandHandler = require('../util/msgUtil');

const config = require('../config');
const { prefix } = config;
let { logMessages } = config;
const whitelist = require('../whitelist');

const today = new Date(Date.now()).toLocaleDateString('en-US').replace(/[/\\]/g, '-');
let logFile = fs.createWriteStream(process.cwd() + '/logs/chatlog-' + today + '.txt', {flags: 'a'});

// Information that is NOT outputted but stored
function addToLog (s) {
	logFile.write(s + '\n');
}

function logToBoth (s) {
	process.stdout.write(s + '\n');
	addToLog(s);
}

async function updateWhitelist () {
	fs.writeFileSync('./whitelist.json', JSON.stringify(whitelist, null, 4));
}

/**
 * Commands for the chat logger
 * @param {IMessage} msg Message object
 * @param {Discordie} client
 */
function loggerCommands (msg, client) {
	const { channel, guild } = msg;
	const ignoreConditions = [
		msg.isPrivate,
		!senderIsOwner(msg),
		!msg.content.startsWith(prefix)
	];
	if (ignoreConditions.reduce((a, b) => a || b)) return;

	const rootCommand = 'log';

	const sendMessage = (s, e) => channel.sendMessage(s, false, e);

	const { addCommand, addCommandSentence }
		= new CommandHandler(msg.content.slice((prefix + rootCommand).length + 1));

	if (!whitelist[guild.id]) whitelist[guild.id] = [];

	addCommand('status', () => {
		if (whitelist[guild.id].includes(channel.id))
			sendMessage('👍');
		else if (Object.keys(whitelist).includes(guild.id))
			sendMessage('👎');
		else
			sendMessage('👎 (Whole server)');
	});

	addCommandSentence('lsg', () => {
		const guildList = Object.keys(whitelist).map(g =>
			client.Guilds.find(cg => cg.id === g).name || `Unknown Guild ${g}`);

		sendMessage(guildList);
	});

	addCommandSentence('lstc', a => {
		const selectedGuild = a ? client.Guilds.find(g => g.name === a) : guild;

		let channelList;
		if (Object.keys(whitelist).includes(selectedGuild.id)) {
			channelList = [
				'```ini',
				...whitelist[selectedGuild.id].map(i => {
					const txc = selectedGuild.textChannels.find(tc => tc.id === i);
					return txc ? '#' + txc.name : `Unknown channel (${i})`;
				}),
				'```'
			].join('\n');
		} else
			channelList = 'There are no logged channels';

		sendMessage(channelList);
	});

	addCommand('start', () => {
		if (logMessages)
			sendMessage('Logging is already enabled');
		else {
			logMessages = true;
			refreshConfig(config);
			sendMessage('Logging enabled');
		}
	});

	addCommand('stop', () => {
		if (!logMessages)
			sendMessage('Logging is already disabled');
		else {
			sendMessage('Logging disabled');
			logMessages = false;
			refreshConfig(config);
		}
	});

	addCommandSentence('whitelist', a => {
		if (a === 'add') {
			if (!whitelist[guild.id].length) {
				// 'Create Guild + Channel' case
				whitelist[guild.id] = [channel.id];
			} else {
				// 'Already whitelisted' case
				if (whitelist[guild.id].includes(channel.id))
					return sendMessage('This channel is already being logged');
				// 'Additional Channel' case
				else {
					whitelist[guild.id].push(channel.id);
					updateWhitelist().then(() => sendMessage('This channel is now being logged'));
				}
			}
		} else if (a === 'remove') {
			if (!whitelist[guild.id] || !whitelist[guild.id].includes(channel.id)) {
				// 'Already not whitelisted' case
				return sendMessage('This channel is already not being logged');
			} else {
				// 'Remove channel' case
				whitelist[guild.id].splice(whitelist[guild.id].indexOf(channel.id), 1);
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
	// So it changes on midnight or after
	const logDate = msg.createdAt.toLocaleDateString('en-US').replace(/[/\\]/g, '-');
	logFile = fs.createWriteStream('logs/chatlog-' + logDate + '.txt', {flags: 'a'});

	const possibleCommand = msg.content.startsWith(prefix);
	const logLine = getLogLine(msg.createdAt, msg, client);

	// Assumed commands and DMs take priority
	let shouldLog = possibleCommand || msg.isPrivate;

	// If neither were true, log whitelisted channels
	if (!shouldLog)
		// Whitelist and config check
		if (msg.guild.id in whitelist && logMessages)
			// Second whitelist check
			if (whitelist[msg.guild.id].includes(msg.channel.id))
				shouldLog = true;

	if (shouldLog)
		logToBoth(logLine);
}

/**
 * @param {Date} time
 * @param {IMessage} msg
 * @param {Discordie} client
 * @returns {String}
 */
function getLogLine (time, msg, client) {
	const timeString = `[${time.toLocaleDateString('en-US')} ${time.toLocaleTimeString('en-US', { hour12: true })}]`;
	const channel = `[${!msg.isPrivate ? `${msg.guild.name}: #${msg.channel.name}` : 'DM: ' + msg.channel.recipient.username}]`;
	const sender = `${(msg.member || msg.author).username}:`; // IUser as substitute for the case of DMs
	const content = resolveMessageContent(msg.content, msg.guild, client);
	const attachments = !msg.attachments.length ? '' : ['', ...msg.attachments].map(a => a.url).join('\n');

	return [
		timeString,
		channel,
		sender,
		// Put to next line if content is multiple lines
		(msg.content.includes('\n') ? '\n' : '') + content,
		attachments
	].join(' ');
}

/**
 * Modified version of `IMessage.resolveContent()` / `IMessageCollection.resolveContent(c, g?)`:
 * 
 * Differences:
 * - User / nickname mention: includes discriminator and id
 * - Channel and Role: indicates if channel or role
 * 
 * @param {String} content
 * @param {IGuild} guild
 * @param {Discordie} client
 * @returns {String}
 */
function resolveMessageContent (content, guild, client) {
	return content.replace(/<(@!?|#|@&)([0-9]+)>/g, (match, type, id) => {
		if (type === '@' || type === '@!') { // user
			const user = client.Users.get(id);
			if (!user)
				return match;
			if (guild && type === '@!') {
				const member = user.memberOf(guild);
				return (member && (`@${member.name}#${member.discriminator}(${member.id})`)) || match;
			}
			return (user && ('@' + user.username + `(${user.id})`)) || match;
		} else if (type === '#') { // channel
			const channel = client.Channels.get(id);
			return (channel && ('#' + channel.name + '(Channel)')) || match;
		} else if (type === '@&') { // role
			if (!guild || !guild.roles)
				return match;
			const role = guild.roles.find(r => r.id === id);
			return (role && ('@' + role.name + '(Role)')) || match;
		}
	});
}

function respond (msg, client) {
	logMsg(msg, client);
	loggerCommands(msg, client);
}

module.exports = {
	whitelist,
	respond,
	addToLog,
	logToBoth
};
