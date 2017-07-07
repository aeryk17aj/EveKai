const CommandHandler = require('../util/msgUtil');
const Discordie = require('discordie');
const Events = Discordie.Events;

const { log } = require('../util/botUtil');

const config = require('../config');

/**
 *
 *
 * @param {IMessage} msg
 * @param {Discordie} client
 * @returns
 */
function respond (msg, client) {
	const { content: msgText, channel: msgChannel } = msg;
	if (!msgText.startsWith(config.prefix)) return;
	// const sender = msg.member || msg.author; // IUser as a substitute for DMs

	// const botUser = msg.isPrivate ? client.User : client.User.memberOf(msgGuild);

	/**
	 * Sends a message
	 * @param {string} s Text
	 * @param {object} e Embed object
	 * @returns {Promise<{}>}
	 */
	const sendMessage = (s, e) => msgChannel.sendMessage(s, false, e);
	// const sendEmbed = (e) => sendMessage('', e);

	const command = msgText.slice(config.prefix.length);
	const handler = new CommandHandler(command);

	const addCommand = (c, f) => handler.addCommand(c, f);
	// const addCommandResponse = (c, r) => addCommand(c, () => sendMessage(r));
	/**
	 *
	 * @param {string} c
	 * @param {function(string)} f
	 */
	const addCommandSentence = (c, f) => handler.addCommandSentence(c, f);
	// const addCommandArgs = (c, f) => handler.addCommandArgs(c, f);

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
		a = a.replace(/\ufe0f|\u200d/gm, ''); // strips unicode variation selector and zero-width joiner
		let i = 0, c = 0, p = 0;
		const r = [];
		while (i < a.length) {
			c = a.charCodeAt(i++);
			if (p) {
				r.push((65536 + (p - 55296 << 10) + (c - 56320)).toString(16));
				p = 0;
			} else if (55296 <= c && c <= 56319) p = c;
			else r.push(c.toString(16));
		}

		sendMessage(r.join('-'));
	});
}

exports.respond = respond;
