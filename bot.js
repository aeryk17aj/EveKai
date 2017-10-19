// Dependencies
const Discordie = require('discordie');
const readline = require('readline');

// Handlers
const consoleHandler = require('./handler/consoleHandler');
const messageHandler = require('./handler/messageHandler');
const vcHandler = require('./handler/vcHandler');
const { logToBoth } = require('./plugins/logger');

// Utility
const { ensureFoldersExist } = require('./util/botUtil');

/** @type {{ prefix: string, hide: boolean }} */
const config = require('./config');

const Events = Discordie.Events;
const client = new Discordie({
	autoReconnect: true
});
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

function log (s) { process.stdout.write(s + '\n'); }

process.on('unhandledRejection', (reason, promise) =>
	log(`Unhandled Promise:\n${promise}\n\n${reason.stack}`));

rl.on('line', c =>
	consoleHandler.respond(c, client));

client.connect({ token: process.env.BOT_TOKEN || require('./auth').loginToken });

// Connection-related

client.Dispatcher.on(Events.GATEWAY_READY, e => { // eslint-disable-line no-unused-vars
	client.User.setStatus(config.hide ? 'invisible' : 'online');
	if (client.User.status === 'online') client.User.setGame('the usual stuff');
	log('[Startup] Checking music folders...');
	ensureFoldersExist(client);
	log('[Startup] Connected.');
});

function getCurrentTime () {
	return new Date(Date.now()).toLocaleString('en-US');
}

client.Dispatcher.on(Events.DISCONNECTED, e =>
	log(`[${getCurrentTime()}] Connection interrupted. (${e.error})`));

client.Dispatcher.on(Events.GATEWAY_RESUMED, () => {
	client.User.setStatus(config.hide ? 'invisible' : 'online');
	log(`[${getCurrentTime()}] Connection resumed.`);
});

// Guild-related

client.Dispatcher.on(Events.GUILD_CREATE, e => {
	logToBoth('[GUILD_CREATE] ' + e.guild.name);
});

// TODO: Make it cuztomizable, per guild
client.Dispatcher.on(Events.GUILD_MEMBER_ADD, e =>
	e.guild.generalChannel.sendMessage(`Welcome, **${e.member.name}** to **${e.guild.name}**.`));

client.Dispatcher.on(Events.GUILD_MEMBER_REMOVE, e =>
	e.guild.generalChannel.sendMessage(`**${e.user.username}** has left **${e.guild.name}**.`));

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
