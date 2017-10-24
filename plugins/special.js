const CommandHandler = require('../util/msgUtil');
const { log, tryRequire } = require('../util/botUtil');
const { getCodePoint } = require('../util/stringUtil');

const toHex = tryRequire('colornames');
const Discordie = require('discordie');
const Events = Discordie.Events;

const config = require('../config');

/**
 * @param {IMessage} msg
 * @param {Discordie} client
 * @returns
 */
function respond (msg, client) {
	const { content: msgText, channel, guild, member: sender } = msg;
	if (!msgText.startsWith(config.prefix)) return;
	const botMember = client.User.memberOf(guild);

	/**
	 * Sends a message
	 * @param {string} s Text
	 * @param {object} e Embed object
	 * @returns {Promise<{}>}
	 */
	const sendMessage = (s, e) => channel.sendMessage(s, false, e);
	// const sendEmbed = (e) => sendMessage('', e);

	const command = msgText.slice(config.prefix.length);
	const handler = new CommandHandler(command);

	const { addCommand, addCommandSentence } = handler;

	const Emojis = {
		ONE: [0x31, 0x20E3],
		TWO: [0x32, 0x20E3],
		THREE: [0x33, 0x20E3],
		FOUR: [0x34, 0x20E3],
		FIVE: [0x35, 0x20E3]
	};

	addCommand('panel', () => {
		sendMessage([
			'1. -',
			'2. -',
			'3. -',
			'4. -',
			'5. -'
		].join('\n')).then((msg, err) => {
			if (err) return log(err);

			addSelectors(msg).then(() => {
				log('done');
				function respondToReact (e) {
					if (e.message.id !== msg.id) return client.Dispatcher.once(Events.MESSAGE_REACTION_ADD, respondToReact);
					log(e.emoji.id);
				}
				client.Dispatcher.once(Events.MESSAGE_REACTION_ADD, respondToReact);
			}, () => {
				log('\u{1F914}');
			});
		});
	});

	async function addSelectors (msg) {
		const p = [];
		p[0] = msg.addReaction(String.fromCodePoint(...Emojis.ONE)).catch(() => log('What?'));
		for (let i = 1; i < Object.keys(Emojis).length; i++) {
			const ind = Object.keys(Emojis)[i];
			log(ind);
			// Dfq so slow
			p[i] = msg.addReaction(String.fromCodePoint(...Emojis[ind])).catch(() => log('What..?'));
		}
		return Promise.all(...p);
	}

	addCommandSentence('unicode', a => {
		if (msgText.includes('<')) return;
		if (/^<:.+?:\d+>$/.test(msgText)) return;
		sendMessage(getCodePoint(a));
	});

	addCommandSentence('setColor', a => {
		const coloredRoles = sender.roles.filter(r => r.color > 0);

		const topSelfRole = coloredRoles.find(r => 
			guild.members.filter(m => m.hasRole(r)).length > 1);

		if (!topSelfRole)
			return sendMessage('You don\'t have a self role.');

		if (!toHex) {
			let hexValue;

			if (a.length === 6)
				hexValue = parseInt(a, 16);
			else if (a.length === 7)
				hexValue = parseInt(a.slice(1), 16);

			if (!hexValue)
				return sendMessage('I\'m sorry, I didn\'t get that.');
			else
				return topSelfRole.commit(null, hexValue).then(() =>
					sendMessage(`Color of \`${topSelfRole.name}\` changed to ${a}`));
		} else {
			if (!toHex.get(a))
				return sendMessage(`I don't know of a color named \`${a}\``);
			else
				return topSelfRole.commit(null, parseInt(toHex(a).slice(1), 16)).then(() =>
					sendMessage(`Color of \`${topSelfRole.name}\` changed to ${a}`));
		}
	});
}

exports.respond = respond;
