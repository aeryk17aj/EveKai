const CommandHandler = require('../util/msgUtil');
const { senderIsOwner: _senderIsOwner, tryRequire } = require('../util/botUtil');
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
	// const botUser = msg.isPrivate ? client.User : client.User.memberOf(guild);

	const sendMessage = (s, e) => msgChannel.sendMessage(s, false, e);
	const sendEmbed = (e) => sendMessage('', e);

	const { addCommand, addCommandSentence, addCommandArgs }
		= new CommandHandler(msgText.slice(prefix.length));

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
		'help | cmds | ?',
		'helpAlt', // temp
		'connections',
		'docs',
		'invite',
		'8ball <yes/no question, always ends with a question mark>',
		'math <math expression>',
		'emoji <server or native emoji>',
		'moveUs <voice channel name>',
		'moveMe <voice channel name>',
		'prune <\'all\' or user mention> <amount>',
		'roll <optional: max number>',
		'time'
	];

	const musicCommands = [
		'm j  | join',
		'm l  | leave',
		'm q  | add [Search term | YouTube URL]',
		'm rm | remove [number in queue]',
		'm p  | play',
		'm sk | skip',
		'm re | repeat [\'one\' | \'all\' | \'off\']',
		'm sh | shuffle',
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

	addCommandSentence('roll', a => sendMessage(Math.ceil(Math.random() * (a || 100))));

	// TODO: add timezone argument, otherwise EST
	addCommand('time', () => {
		const currentTime = new Date(Date.now()).toLocaleTimeString('en-US', {hour12: true});
		const timeShort = currentTime.replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, '$1$3');
		sendMessage(`It's ${codeL(timeShort)} EST.`);
	});
}

exports.respond = respond;
