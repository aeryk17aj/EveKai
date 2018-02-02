// Dependencies
const Discordie = require('discordie');
const readline = require('readline');

// Handlers
const consoleHandler = require('./handler/consoleHandler');
const messageHandler = require('./handler/messageHandler');
const vcHandler = require('./handler/vcHandler');
const { logToBoth } = require('./plugins/logger');

// Utility
const { ensureFoldersExist, log } = require('./util/botUtil');

/** @type {{ prefix: string, hide: boolean }} */
const config = require('./config');

const { Events } = Discordie;
const client = new Discordie({
	autoReconnect: true
});
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

process.on('unhandledRejection', (reason, promise) =>
	log(`Unhandled Promise: ${promise.name || 'anonymous Promise'}\n\n${reason}`));

rl.on('line', c =>
	consoleHandler.respond(c, client));

client.connect({ token: process.env.BOT_TOKEN || require('./auth').loginToken });

function getCurrentTime () {
	const now = new Date(Date.now())
	return `${now.toLocaleDateString('en-US')} ${now.toLocaleTimeString('en-US', { hour12: true })}`;
}

// Connection-related

client.Dispatcher.on(Events.GATEWAY_READY, e => { // eslint-disable-line no-unused-vars
	client.User.setStatus(config.hide ? 'invisible' : 'online');
	if (client.User.status === 'online') client.User.setGame({ type: 3, name: 'you all'});
	log(`[${getCurrentTime()}] Checking music folders...`);
	ensureFoldersExist(client);
	log(`[${getCurrentTime()}] Connected.`);
});

client.Dispatcher.on(Events.DISCONNECTED, e =>
	log(`[${getCurrentTime()}] Connection interrupted. (${e.error})`));

client.Dispatcher.on(Events.GATEWAY_RESUMED, () => {
	client.User.setStatus(config.hide ? 'invisible' : 'online');
	log(`[${getCurrentTime()}] Connection resumed.`);
});

// Guild-related

client.Dispatcher.on(Events.GUILD_CREATE, e => {
	logToBoth('[GUILD_CREATE] ' + e.guild.name);
	ensureFoldersExist(client);
});

client.Dispatcher.on(Events.GUILD_MEMBER_ADD, e => {
	const channel = e.guild.generalChannel || e.guild.textChannels.find(tc => tc.name === 'general');
	channel && channel.sendMessage(`Welcome, **${e.member.name}** to **${e.guild.name}**.`);
});

client.Dispatcher.on(Events.GUILD_MEMBER_REMOVE, e => {
	const channel = e.guild.generalChannel || e.guild.textChannels.find(tc => tc.name === 'general');
	channel && channel.sendMessage(`**${e.user.username}** has left **${e.guild.name}**.`);
});

// Message related

client.Dispatcher.on(Events.MESSAGE_CREATE, e =>
	messageHandler.handle(e, client));

/* client.Dispatcher.on(Events.MESSAGE_REACTION_ADD, e => {
	// if (e.user.id !== botUser.id)
	console.log('Reacted!');
}); */

// Voice related

client.Dispatcher.on(Events.VOICE_CHANNEL_JOIN, e =>
	vcHandler.handle(e));
