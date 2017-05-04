const CommandHandler = require('../util/msgUtil');
const Discordie = require('discordie');
const Events = Discordie.Events;

const config = require('../config');

/**
 * 
 * 
 * @param {IMessage} msg 
 * @param {Discordie} client 
 * @returns 
 */
function respond (msg, client) {
	const msgText = msg.content;
	if (!msgText.startsWith(config.prefix)) return;
	// const sender = msg.member || msg.author; // IUser as a substitute for DMs
	const msgChannel = msg.channel;
	const msgGuild = msg.guild;

	const botUser = msg.isPrivate ? client.User : client.User.memberOf(msgGuild);

	/**
	 * Sends a message
	 * @param {string} s Text
	 * @param {object} e Embed object
	 * @returns {Promise<{}>}
	 */
	const sendMessage = (s, e) => msgChannel.sendMessage(s, false, e);
	const sendEmbed = (e) => sendMessage('', e);

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
			if (err) return console.log(err);

			addSelectors(msg).then(() => {
				client.Dispatcher.on(Events.MESSAGE_RECTION_ADD, e => {
					if (e.user.id !== botUser.id) console.log('Reacted!');
				});
			});

		});
	});

	async function addSelectors (msg) {
		let p = msg.addReaction(String.fromCodePoint(...Emojis.ONE));
		for (let i = 1; i < Object.keys(Emojis).length; i++) {
			const ind = Object.keys(Emojis)[i];
			p = await msg.addReaction(Emojis[ind]);
		}
	}

	addCommandSentence('emoji', a => {
		a = a.replace(/\ufe0f|\u200d/gm, ''); // strips unicode variation selector and zero-width joiner
		let i = 0, c = 0, p = 0;
		const r = [];
		while (i < a.length){
			c = a.charCodeAt(i++);
			if (p){
				r.push((65536 + (p - 55296 << 10) + (c - 56320)).toString(16));
				p = 0;
			} else if (55296 <= c && c <= 56319){
				p = c;
			} else {
				r.push(c.toString(16));
			}
		}

		sendMessage(r.join('-'));
	});
}

exports.respond = respond;