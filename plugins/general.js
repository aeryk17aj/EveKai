const CommandHandler = require('../util/msgUtil');
const Discordie = require('discordie');
const Permissions = Discordie.Permissions;
const math = require('mathjs');

const logger = require('./logger');
const util = require('../util/botUtil');
const stringUtil = require('../util/stringUtil');
const arrayUtil = require('../util/arrayUtil');

/**
 * @typedef Configuration
 * @type {object}
 * @prop {string} prefix - The bot's prefix
*/

/** @type {Configuration} */
const config = require('../config');

const ballQuotes = require('../quotes/8ball');
const leaveQuotes = require('../quotes/disconnect');
const docLinks = require('../quotes/docs');

/**
 * @callback channel~sendMessage
 * @param {string} message The message to be sent
 * @param {booleam} tts Determines whether the message will be sent as a TTS message
 * @param {object} embed Embed object
 * @returns {Promise<{}>}
 */

/**
 * @typedef ITextChannel
 * @prop {function} sendMessage Sends a message
 */

/**
 * @typedef IMessage
 * @prop {string} content The string content of the message
 * @prop {ITextChannel} channel The text channel the message belongs to
 * @prop {boolean} isPrivate Determines whether the message is in a direct message channel or not
 */

/**
 * Primary message listener
 * @param {IMessage} msg Message object to be used
 * @param {Discordie} client description
 */
function respond (msg, client) {
	const msgText = msg.content;
	if (!msgText.startsWith(config.prefix)) return;
	const sender = msg.member || msg.author; // IUser as a substitute for DMs
	const msgChannel = msg.channel;
	const msgGuild = msg.guild;

	const botUser = msg.isPrivate ? client.User : client.User.memberOf(msgGuild);

	/**
	 * Sends a message
	 * @param {string} s Text
	 * @param {object} e Embed object
	 * @returns {Promise<IMessage>}
	 */
	const sendMessage = (s, e) => msgChannel.sendMessage(s, false, e);
	const sendEmbed = (e) => sendMessage('', e);

	const command = msgText.slice(config.prefix.length);
	const handler = new CommandHandler(command);

	const addCommand = (c, f) => handler.addCommand(c, f);
	const addCommandResponse = (c, r) => addCommand(c, () => sendMessage(r));
	const addCommandSentence = (c, f) => handler.addCommandSentence(c, f);
	const addCommandArgs = (c, f) => handler.addCommandArgs(c, f);

	const codeL = s => stringUtil.codeL(s);
	const rInAr = ar => arrayUtil.rInAr(ar);
	const senderIsOwner = util.senderIsOwner(msg);

	addCommand('dc', () => {
		if (!senderIsOwner) return;

		setTimeout(() => {
			sendMessage(rInAr(leaveQuotes)).then(() => {
				logger.logToBoth('[System] System Disconnected (command)');
				client.disconnect();
				process.exit();
			});
		}, 2000);
	});

	addCommandResponse('connections', codeL(client.User.username) + ' is connected to ' + codeL(client.Guilds.length) + ' servers.');
	addCommandSentence('docs', a => {
		if (docLinks.hasOwnProperty(a)) sendMessage(docLinks[a]);
		else sendMessage('I don\'t have a link for ' + codeL(a));
	});

	const generalCommands = [
		'help/cmds/?',
		'connections',
		'docs',
		// 'invite (bot invite)',
		'roll <optional: max number>',
		'8ball <yes/no question, always ends with a question mark>',
		'prune <\'all\' or user mention> <amount>',
		'time',
		'elwiki'
	];

	const musicCommands = [
		'join',
		'leave',
		'm q  | add [Search term | YouTube URL]',
		'm rm | remove [number in queue]',
		'm sh | shuffle',
		'm p  | play',
		'm s  | skip',
		'm re | repeat [\'one\' | \'all\' | \'off\']',
		'stop',
		'clear',
		'list'
	];

	function showHelp (a) {
		let help;
		if (a === 'music') {
			help = [
				'```ini',
				'[Music Commands]', '',
				...musicCommands.map(a => config.prefix + a),
				'```'
			].join('\n');
		} else {
			help = [
				'```ini',
				'[General Commands]', '',
				...generalCommands.map(a => config.prefix + a),
				'', 'do \'' + config.prefix + '? music\' for music commands',
				'```'
			].join('\n');
		}
		sendMessage(help);
	}

	['help', 'cmds', '?'].forEach(s => addCommandSentence(s, showHelp));

	/**
	 * @param {string[]} sarr
	 * @returns {string} output
	 */
	function displayAsCommandList (sarr) {
		return sarr.map(a => {
			const spI = a.indexOf(' ');
			return `\`${config.prefix}${a.slice(0, spI)}\`${a.slice(spI)}`;
		}).join('\n');
	}

	addCommand('helpAlt', () => {
		sendMessage('', {
			color: 0x2ECC71,
			fields: [ {
				name: 'General',
				value: displayAsCommandList(generalCommands)
			}, {
				name: 'Music',
				value: displayAsCommandList(musicCommands)
			} ]
		});
	});

	addCommand('invite', () => {
		const inviteLink = `https://discordapp.com/oauth2/authorize?&client_id=${client.User.id}&scope=bot&permissions=34611200`;
		/**
		 * Required perms
		 *
		 * Manage Messages: for prune
		 * Connect: To join voice ¯\_(ツ)_/¯
		 * Use Voice Activity: to stream sick beats
		 */
		// if (msg.channel.isDM || msg.channel.isGroupDM) return sendMessage(inviteLink);
		sender.openDM().then((dmChannel, err) => {
			if (err) return process.stdout.write(`${err}\n`);
			dmChannel.sendMessage(inviteLink);
		});
	});

	// This is where the fun starts
	addCommandSentence('8ball', a => {
		if (a.endsWith('?')) {
			sendEmbed({
				color: 0xFFB2C5,
				author: {
					name: (sender.nickname || sender.name),
					icon_url: sender.avatarURL
				},
				title: a,
				description: 'Answer: ' + rInAr(ballQuotes)
			});
		} else sendMessage('Use a question mark.');
	});

	addCommandSentence('eval', a => {
		if (!senderIsOwner || a === 'e.message.content' || a === 'msgText') return;
		let result;
		return new Promise(resolve => {
			result = eval(a);
			resolve('Success');
		}).catch(e => {
			// sendMessage('\u{1F52B}'); // Peestol
			process.stdout.write(`${e}\n`);
			sendMessage('It didn\'t work.');
		}).then(v => {
			if (v === 'Success') {
				if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') sendMessage(result);
				else if (Array.isArray(result)) sendMessage(result.join(', '));
				// else sendMessage('\u{1F44C}'); // Ok hand sign
			}
		});
	});

	addCommandSentence('math', a => sendMessage(math.eval(a)));

	addCommandArgs('emoji', a => {
		// if (!/^<:.+?:\d+>$/.test(msgText)) return;
		sendMessage(a.map(e => e.replace(/^<:.+?:(\d+)>$/, '$1')).map(i => `https://cdn.discordapp.com/emojis/${i}.png`).join('\n'));
	});

	function fetchMoreMessages (channel, left) {
		const before = channel.messages[0];
		return channel.fetchMessages(Math.min(left, 100), before)
			.then(e => onFetch(e, channel, left));
	}

	function onFetch (e, channel, left) {
		if (!e.messages.length) return Promise.resolve();
		left -= e.messages.length;
		if (left <= 0) return Promise.resolve();
		return fetchMoreMessages(channel, left);
	}

	function fetchMoreSpecificMessages (channel, user, left) {
		const before = channel.messages.filter(m => m.author.id === user.id)[0];
		return channel.fetchMessages(100, before)
			.then(e => onFetchUser(e, channel, user, left));
	}

	function onFetchUser (e, channel, user, left) {
		if (!e.messages.length) return Promise.resolve();
		left -= e.messages.filter(m => m.author.id === user.id).length;
		if (left <= 0) return Promise.resolve();
		return fetchMoreSpecificMessages(channel, user, left);
	}

	function deleteMessages (msgs, channel, left) {
		if (!left) left = msgs.length;
		const removeCount = Math.min(100, left);
		return client.Messages.deleteMessages(msgs.slice(0, removeCount), channel)
			.then(() => onDeleteMore(msgs, channel, left - removeCount))
			// .catch(() => console.log('What, why can\'t it delete?'));
			.catch(() => sendMessage('Deleting past 100 is broken at the moment.\nPlease prune by 100s while Aeryk gets this fixed.'));
	}

	function onDeleteMore (msgs, channel, left) {
		// Messages are fetched when insufficient before deletion so...
		// If there's nothing to delete, it's done deleting
		if (!msgs.length || left <= 0) return Promise.resolve();
		return deleteMessages(msg, channel, left);
	}

	addCommandSentence('prune', a => {
		// Sender can't delete or pin messages
		if (!sender.can(Permissions.Text.MANAGE_MESSAGES, msgGuild)) return sendMessage('No.');
		// Bot can't delete or pin messages
		if (!botUser.can(Permissions.Text.MANAGE_MESSAGES, msgGuild)) return sendMessage('I don\'t have permission.');
		// Empty args
		if (!a.length) return sendMessage(`\`${config.prefix}prune <\'all\' or user mention> <amount>\``);

		const mention = a.split(' ')[0];
		const amount = parseInt(a.split(' ')[1]);

		let allMsgs = false;

		let messages = client.Messages.forChannel(msgChannel).filter(m => !m.deleted);
		if (msg.mentions.length) messages = messages.filter(m => m.author.id === msg.mentions[0].id);
		else if (mention === 'all') allMsgs = true;
		else return sendMessage('Has to be `all` or a user mention.');

		if (amount > messages.length) {
			// console.log(`about to delete ${amount} out of ${messages.length} in cache`);
			if (allMsgs) {
				const difference = amount - messages.length;
				fetchMoreMessages(msgChannel, difference).then(() => {
					messages = client.Messages.forChannel(msgChannel).filter(m => !m.deleted);
					// console.log(`Post fetch: ${amount} out of ${messages.length} in cache`);
					deleteMessages(messages.slice(-amount), msgChannel);
				});
			} else {
				fetchMoreSpecificMessages(msgChannel, msg.mentions[0], amount).then(() => {
					messages = client.Messages.forChannel(msgChannel).filter(m => !m.deleted && m.author.id === msg.mentions[0].id);
					deleteMessages(messages.slice(-amount), msgChannel);
				});
			}
		} else deleteMessages(messages.slice(-amount), msgChannel);
	});

	addCommandSentence('roll', a => {
		sendMessage(Math.ceil(Math.random() * (a || 100)));
	});

	// TODO: add timezone argument, otherwise EST
	addCommand('time', () => {
		const currentTime = new Date(Date.now()).toLocaleTimeString('en-US', {hour12: true});
		const timeShort = currentTime.replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, '$1$3');
		sendMessage(`It's ${codeL(timeShort)} EST.`);
	});

	addCommandArgs('elwiki', a => {
		if (a.length) return;
		const pageName = a.map(w => w[0].toUpperCase() + w.slice(1)).join('_');
		sendMessage('http://elwiki.net/w/' + pageName);
	});
}

exports.respond = respond;
