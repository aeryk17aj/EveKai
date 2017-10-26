const CommandHandler = require('../util/msgUtil');
const { senderIsOwner: _senderIsOwner, tryRequire } = require('../util/botUtil');
const Permissions = require('discordie').Permissions;
const math = tryRequire('mathjs');

const { logToBoth } = require('./logger');
const { codeL, getCodePoint } = require('../util/stringUtil');
const { rInAr } = require('../util/arrayUtil');

/** @type {{prefix: string}} */
const { prefix } = require('../config');

const ballQuotes = require('../quotes/8ball');
const leaveQuotes = require('../quotes/disconnect');
const docLinks = require('../quotes/docs');

/**
 * Primary message listener
 * @param {IMessage} msg Message object to be used
 * @param {Discordie} client description
 */
function respond (msg, client) {
	const { content: msgText, channel: msgChannel, guild: msgGuild, member: sender } = msg;
	if (!msgText.startsWith(prefix)) return;

	/** @type {IUser | IGuildMember} */
	const botUser = msg.isPrivate ? client.User : client.User.memberOf(msgGuild);

	/**
	 * Sends a message
	 * @param {string} s Text
	 * @param {object} e Embed object
	 * @returns {Promise<IMessage>}
	 */
	const sendMessage = (s, e) => msgChannel.sendMessage(s, false, e);
	const sendEmbed = (e) => sendMessage('', e);

	const command = msgText.slice(prefix.length);
	const { addCommand, addCommandSentence, addCommandArgs } 
		= new CommandHandler(command);

	/**
	 * @param {string} c
	 * @param {string} r
	 */
	const addCommandResponse = (c, r) => addCommand(c, () => sendMessage(r));

	const senderIsOwner = _senderIsOwner(msg);

	addCommand('dc', () => {
		if (!senderIsOwner) return;

		setTimeout(() => {
			sendMessage(rInAr(leaveQuotes)).then(() => {
				logToBoth('[System] System Disconnected (command)');
				client.disconnect();
				process.exit();
			});
		}, 2000);
	});

	addCommandResponse('connections', `Connected to ${codeL(client.Guilds.length)} servers.`);
	addCommandSentence('docs', a => {
		sendMessage(docLinks.hasOwnProperty(a)
			? docLinks[a]
			: 'I don\'t have a link for ' + codeL(a));
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
		'elwiki <page name / search query>',
		'math <math expression>',
		'emoji <server or native emoji>',
		'moveUs',
		'moveMe'
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

	// TODO: Help builder?
	function showHelp (a) {
		let help;
		if (a === 'music')
			help = [
				'```ini',
				'[Music Commands]', '',
				...musicCommands.map(a => prefix + a),
				'```'
			].join('\n');
		else
			help = [
				'```ini',
				'[General Commands]', '',
				...generalCommands.map(a => prefix + a),
				'', 'do \'' + prefix + '? music\' for music commands',
				'```'
			].join('\n');

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
			return `\`${prefix}${a.slice(0, spI)}\`${a.slice(spI)}`;
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

	addCommandSentence('8ball', a => {
		if (a.endsWith('?'))
			sendEmbed({
				color: 0xFFB2C5,
				author: {
					name: (sender.name),
					icon_url: sender.avatarURL
				},
				title: a,
				description: 'Answer: ' + rInAr(ballQuotes)
			});
		else
			sendMessage('Use a question mark.');
	});

	addCommandSentence('eval', a => {
		if (!senderIsOwner || a === 'msg.content' || a === 'msgText') return;
		let result;
		return new Promise((resolve, reject) => {
			result = eval(a);
			if (result === msgText) reject();
			else resolve();
		}).catch(e => {
			process.stdout.write(`Failed eval in ${msgGuild.name} : ${msgChannel.name}\n\n${e}\n`);
			sendMessage('It didn\'t work.');
		}).then(() => {
			switch (typeof result) {
				case 'string': case 'number': case 'boolean':
					sendMessage(result); break;
				default:
					if (Array.isArray(result)) sendMessage(result.join(', '));
			}
		});
	});

	if (math)
		addCommandSentence('math', a => sendMessage(math.eval(a)));

	addCommandArgs('emoji', a => {
		const validCustomEmoji = /^<:.+?:(\d+)>$/;

		const invalidArgs = [];
		a.forEach(e => { if (!validCustomEmoji.test(e)) invalidArgs.push(e); });
		if (invalidArgs.length) {
			if (invalidArgs.length === a.length)
				return sendMessage(invalidArgs.map(getCodePoint));

			return sendMessage('There are some invalid inputs: ' + invalidArgs.join(' '));
		}
		else sendMessage(a.map(e => e.replace(/^<:.+?:(\d+)>$/, '$1')).map(i => `https://cdn.discordapp.com/emojis/${i}.png`).join('\n'));
	});

	/**
	 * @param {string} a Name of the voice channel
	 * @returns {Promise<IMessage> | {senderVC: IVoiceChannel, destinationVc: IVoiceChannel}}
	 */
	function verifyMoveQuery (a) {
		const senderVc = sender.getVoiceChannel();
		if (!senderVc) return sendMessage('You\'re not in a voice channel.');

		const destinationVc = msgGuild.voiceChannels.find(vc => vc.name === a);
		if (!destinationVc) return sendMessage(`There is no voice channel named \`${a}\``);

		return { senderVc, destinationVc };
	}

	addCommandSentence('moveUs', a => {
		const result = verifyMoveQuery(a);
		if (result instanceof Promise) return;
		const { senderVc, destinationVc } = result;
		const memList = senderVc.members;
		const moves = memList.map(m => m.setChannel(destinationVc));
		return Promise.all(moves);
	});

	addCommandSentence('moveMe', a => {
		const result = verifyMoveQuery(a);
		if (result instanceof Promise) return;
		const { destinationVc } = result;
		return sender.setChannel(destinationVc);
	});

	// This is honestly a disaster

	/* function fetchMore (amount, messages) {
		if (amount !== 0) {
			if (amount > 100) {
				msgChannel.fetchMessages(100).then((m) => {
					messageArray = [...messageArray, m.messages];
					amount -= 100;
					fetchMore(amount, messages);
				});
			} else {
				msgChannel.fetchMessages(amount).then((m) => {
					messageArray = [...messageArray, m.messages];
					amount -= amount;
					fetchMore(amount, messages);
				});
			}
		}
	} */

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
			.catch(() => sendMessage(`
				Deleting past 100 is broken at the moment.\n
				Please prune by 100s while Aeryk gets this fixed.
			`));
	}

	function onDeleteMore (msgs, channel, left) {
		// Messages are fetched when insufficient before deletion so...
		// If there's nothing to delete, it's done deleting
		if (!msgs.length || left <= 0) return Promise.resolve();
		return deleteMessages(msg, channel, left);
	}

	addCommandSentence('prune', a => {
		// Sender can't delete or pin messages
		if (!sender.can(Permissions.Text.MANAGE_MESSAGES, msgGuild)) return;
		// Bot can't delete or pin messages
		if (!botUser.can(Permissions.Text.MANAGE_MESSAGES, msgGuild)) return sendMessage('I don\'t have permission.');
		// Empty args
		if (!a.length) return sendMessage(`\`${prefix}prune <'all' or user mention> <amount>\``);

		const mention = a.split(' ')[0];
		const amount = parseInt(a.split(' ')[1]);

		let allMsgs = false;

		let messages = client.Messages.forChannel(msgChannel).filter(m => !m.deleted);
		if (msg.mentions.length) messages = messages.filter(m => m.author.id === msg.mentions[0].id);
		else if (mention === 'all') allMsgs = true;
		else return sendMessage('Has to be `all` or a user mention.');

		if (amount > messages.length) {
			// console.log(`about to delete ${amount} out of ${messages.length} in cache`);
			if (allMsgs)
				fetchMoreMessages(msgChannel, amount - messages.length).then(() => {
					messages = client.Messages.forChannel(msgChannel).filter(m => !m.deleted);
					// console.log(`Post fetch: ${amount} out of ${messages.length} in cache`);
					deleteMessages(messages.slice(-amount), msgChannel);
				});
			else
				fetchMoreSpecificMessages(msgChannel, msg.mentions[0], amount).then(() => {
					messages = client.Messages.forChannel(msgChannel).filter(m => !m.deleted && m.author.id === msg.mentions[0].id);
					deleteMessages(messages.slice(-amount), msgChannel);
				});
		} else deleteMessages(messages.slice(-amount), msgChannel);
	});

	addCommandSentence('roll', a => sendMessage(Math.ceil(Math.random() * (a || 100))));

	// TODO: add timezone argument, otherwise EST
	addCommand('time', () => {
		const currentTime = new Date(Date.now()).toLocaleTimeString('en-US', {hour12: true});
		const timeShort = currentTime.replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, '$1$3');
		sendMessage(`It's ${codeL(timeShort)} EST.`);
	});
}

exports.respond = respond;
