const botUtil = require('../util/botUtil');
const CommandHandler = require('../util/msgUtil');
const Permissions = require('discordie').Permissions;
const logger = require(botUtil.getPlugin('logger'));

const config = require('../config');
const userIds = require('../userIds');

const ballQuotes = require(botUtil.getQuotes('8ball'));
const leaveQuotes = require(botUtil.getQuotes('disconnect'));
const docLinks = require(botUtil.getQuotes('docs'));
const commands = require(botUtil.getQuotes('commands'));

/**
 * Primary message listener
 * @param  {IMessage} msg Message object to be used
 * @param  {Discordie} client Bot client object
 */
function respond (msg, client) {
	const msgText = msg.content;
	const sender = msg.member || msg.author; // IUser as a substitute for DMs
	const msgChannel = msg.channel;
	const msgGuild = msg.guild;

	const botUser = msg.isPrivate ? client.User : client.User.memberOf(msgGuild);

	const sendMessage = (s, e) => msgChannel.sendMessage(s, false, e);
	const sendEmbed = (e) => sendMessage('', e);

	const command = msgText.slice(config.prefix.length);
	const handler = new CommandHandler(command);

	if (!msgText.startsWith(config.prefix)) return;

	const addCommand = (c, f) => handler.addCommand(c, f);
	const addCommandResponse = (c, r) => addCommand(c, () => sendMessage(r));
	const addCommandSentence = (c, f) => handler.addCommandSentence(c, f);
	const addCommandArgs = (c, f) => handler.addCommandArgs(c, f);

	const codeL = s => botUtil.codeL(s);
	const rInAr = ar => botUtil.rInAr(ar);
	const senderIsOwner = botUtil.senderIsOwner(msg);

	addCommand('dc', () => {
		if (!senderIsOwner) return;

		setTimeout(() => {
			sendMessage(rInAr(leaveQuotes)).then(() => {
				logger.logToBoth('[System] System Disconnected (command)');
				client.disconnect();
				process.exit(); // TODO: Investigate lingering process
			});
		}, 2000);
	});

	addCommandResponse('connections', codeL(client.User.username) + ' is connected to ' + codeL(client.Guilds.length) + ' servers.');
	addCommandSentence('docs', a => {
		if (docLinks.hasOwnProperty(a)) sendMessage(docLinks[a]);
		else sendMessage('I don\'t have a link for ' + codeL(a));
	});

	function showHelp (a) {
		let help;
		if (a === 'music') {
			help = [
				'```ini',
				'[Music Commands]', '',
				...[
					'join',
					'leave',
					'm q | add [Search term | YouTube URL]',
					'm rm | remove [number in queue]',
					'm sh | shuffle',
					'm p | play',
					'm s | skip',
					'm re | repeat [\'one\' | \'all\' | \'off\']',
					'stop',
					'clear',
					'list'
				].map(a => config.prefix + a),
				'```'
			].join('\n');
		} else if (a === 'sekrit'){
			help = [
				'```ini',
				'[Sekrit Commands]', '',
				...[
					'pfp (fetches your pfp for her future use)',
					'testDraw'
				].map(a => config.prefix + a),
				'```'
			].join('\n');
		} else {
			help = [
				'```ini',
				'[General Commands]', '',
				...['help/cmds/?',
					'connections',
					'docs',
					// 'invite (bot invite)',
					'roll <optional: max number>',
					'8ball <yes/no question, always ends with a question mark>',
					'prune <\'all\' or user mention> <amount>',
					'time',
					'elwiki'
				].map(a => config.prefix + a),
				'', 'do \'' + config.prefix + '? music\' for music commands',
				'```'
			].join('\n');
		}
		sendMessage(help);
	}

	['help', 'cmds', '?'].forEach(s => addCommandSentence(s, showHelp));

	addCommand('invite', () => {
		const inviteLink = `https://discordapp.com/oauth2/authorize?&client_id=${userIds.eve}&scope=bot&permissions=34611200`;
		/**
		 * Required perms
		 *
		 * Manage Messages: for prune
		 * Connect: To join voice ¯\_(ツ)_/¯
		 * Use Voice Activity: to stream sick beats
		 */
		// if (msg.channel.isDM || msg.channel.isGroupDM) return sendMessage(inviteLink);
		sender.openDM().then((dmChannel, err) => {
			if (err) return console.log(err);
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
			console.log(e);
			sendMessage('It didn\'t work.');
		}).then(v => {
			if (v === 'Success') {
				if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') sendMessage(result);
				else if (Array.isArray(result)) sendMessage(result.join(', '));
				// else sendMessage('\u{1F44C}'); // Ok hand sign
			}
		});
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
			//.catch(() => console.log('What, why can\'t it delete?'));
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
		if(!a.length) return sendMessage(`\`${config.prefix}prune <\'all\' or user mention> <amount>\``);

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
// module.exports = respond;
