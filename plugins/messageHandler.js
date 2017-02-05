const botUtil = require(process.cwd() + '/util/botUtil');
const msgUtil = require('../util/msgUtil');
const logger = require(botUtil.getPlugin('logger'));

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
	// Used for eval
	const botUser = msg.isPrivate ? client.User : client.User.memberOf(msgGuild);

	const sendMessage = (s, e) => msgChannel.sendMessage(s, false, e);
	const sendEmbed = (e) => sendMessage('', e);

	const addCommand = (c, f) => msgUtil.addCommand(msgText, c, f);
	const addCommandResponse = (c, r) => addCommand(c, () => sendMessage(r));
	const addCommandArgs = (c, f) => msgUtil.addCommandArgs(msgText, c, f);
	const addCommandSentence = (c, f) => addCommandArgs(c, a => f(a.join(' ')));

	const codeL = s => botUtil.codeL(s);
	const rInAr = ar => botUtil.rInAr(ar);
	const senderIsOwner = botUtil.senderIsOwner(msg);

	addCommand('dc', () => {
		if (!senderIsOwner) return;
		sendMessage(rInAr(leaveQuotes));
		logger.logToBoth('[System] System Disconnected (command)');
		setTimeout(() => {
			client.disconnect();
			process.exit();
		}, 2000);
	});

	addCommandResponse('info', 'Running on 2.0.0-1.');
	addCommandResponse('v2?', 'Yep, Eve is being split into (still connected) parts instead of being one big file.');
	addCommandResponse('builtOn', codeL(client.User.username) + ' is currently running on under `Discordie 0.10.0` (Node.js)');
	addCommandResponse('connections', codeL(client.User.username) + ' is connected to ' + codeL(client.Guilds.length) + ' servers.');
	addCommandResponse('docs', 'http://qeled.github.io/discordie/#/docs/Discordie?_k=grrhaj');
	addCommandSentence('docs', a => {
		if (docLinks.hasOwnProperty(a)) sendMessage(docLinks[a]);
		else sendMessage('I don\'t have a link for ' + codeL(a));
	});

	addCommandResponse('cmds', Object.keys(commands.general).map(s => codeL(s)).join(', '));

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
		}).catch(() => {
			// sendMessage('\u{1F52B}'); // Peestol
			logger.logToBoth('[System] Evaluation error');
		}).then(v => {
			if (v === 'Success') {
				if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') sendMessage(result);
				else if (Array.isArray(result)) sendMessage(result.join(', '));
				else sendMessage('\u{1F44C}'); // Ok hand sign
			}
		});
	});

	addCommandResponse('roll', codeL(Math.ceil(Math.random() * 100))); // Default 100
	addCommandArgs('roll', a => {
		if (a.length > 1) sendMessage('Invalid argument count: ' + codeL(a.length));
		else sendMessage(codeL(Math.ceil(Math.random() * a[0])));
	});

	// TODO add timezone argument, otherwise EST
	addCommand('time', () => {
		const currentTime = new Date(Date.now()).toLocaleTimeString('en-US', {hour12: true});
		const timeShort = currentTime.replace(/([\d]+:[\d]{2})(:[\d]{2})(.*)/, '$1$3');
		sendMessage(`It's ${codeL(timeShort)} EST.`);
	});

	addCommandArgs('elwiki', a => {
		const pageName = a.map(w => w[0].toUpperCase() + w.slice(1)).join('_');
		sendMessage('http://elwiki.net/w/' + pageName);
	});
}

exports.respond = respond;
// module.exports = respond;
