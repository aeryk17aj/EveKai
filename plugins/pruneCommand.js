const CommandHandler = require('../util/msgUtil');
const { Permissions } = require('discordie');
const { deleteMessages, fetchMoreMessages, fetchMoreSpecificMessages }
	= require('../util/pruneUtil');
const { senderIsOwner } = require('../util/botUtil');
const { prefix } = require('../config');

function respond (msg, client) {
	const { channel, guild, member } = msg;

	if (msg.isPrivate ||
		!senderIsOwner(msg) ||
		!msg.content.startsWith(prefix))
		return;

	const sendMessage = (s, e) => channel.sendMessage(s, false, e);

	const { addCommandSentence: acs }
		= new CommandHandler(msg.content.slice(prefix.length + 1));

	acs('prune', a => {
		// Sender can't delete or pin messages
		if (!member.can(Permissions.Text.MANAGE_MESSAGES, guild)) return;
		// Bot can't delete or pin messages
		if (!client.User.memberOf(guild).can(Permissions.Text.MANAGE_MESSAGES, guild))
			return sendMessage('I don\'t have permission.');
		// Empty args
		if (!a.length) return sendMessage(`\`${prefix}prune <'all' or user mention> <amount>\``);

		const mention = a.split(' ')[0];
		const amount = parseInt(a.split(' ')[1]);

		let allMsgs = false;

		let messages = client.Messages.forChannel(channel).filter(m => !m.deleted);
		if (msg.mentions.length)
			messages = messages.filter(m => m.author.id === msg.mentions[0].id);
		else if (mention === 'all')
			allMsgs = true;
		else
			return sendMessage('Has to be `all` or a user mention.');

		if (amount > messages.length) {
			// console.log(`about to delete ${amount} out of ${messages.length} in cache`);
			if (allMsgs)
				fetchMoreMessages(channel, amount - messages.length).then(() => {
					messages = client.Messages.forChannel(channel).filter(m => !m.deleted);
					// console.log(`Post fetch: ${amount} out of ${messages.length} in cache`);
					deleteMessages(messages.slice(-amount), channel);
				});
			else
				fetchMoreSpecificMessages(channel, msg.mentions[0], amount).then(() => {
					messages = client.Messages.forChannel(channel).filter(m =>
						!m.deleted && m.author.id === msg.mentions[0].id);
					deleteMessages(messages.slice(-amount), channel);
				});
		} else deleteMessages(messages.slice(-amount), channel);
	});
}

exports.respond = respond;