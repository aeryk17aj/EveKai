// Dependencies
const Discordie = require('discordie');
const readline = require('readline');

// Handlers
const consoleHandler = require('./handler/consoleHandler');
const messageHandler = require('./handler/messageHandler');
const vcHandler = require('./handler/vcHandler');
const logger = require('./plugins/logger');

// Utility
const util = require('./util/botUtil');

/**
 * @typedef Configuration
 * @type {object}
 * @property {string} prefix - The bot's prefix
 * @property {boolean} hide - Factor to whether the bot oges invisible on start / resume or not
*/

/** @type {Configuration} */
const config = require('./config');

const Events = Discordie.Events;
const client = new Discordie({
	autoReconnect: true
});
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

process.on('unhandledRejection', err =>
	console.log(`Unhandled Promise:\n${err.stack}`));

rl.on('line', c =>
	consoleHandler.respond(c, client));

client.connect({ token: process.env.BOT_TOKEN || require('./auth').loginToken });

// Connection-related

client.Dispatcher.on(Events.GATEWAY_READY, e => { // eslint-disable-line no-unused-vars
	client.User.setStatus(config.hide ? 'invisible' : 'online');
	if (client.User.status === 'online') client.User.setGame('with new discoveries');
	console.log('[Startup] Checking music folders...');
	util.ensureFoldersExist(client);
	console.log('[Startup] Connected.');
});

function getCurrentTime () {
	return new Date(Date.now()).toLocaleString('en-US');
}

client.Dispatcher.on(Events.DISCONNECTED, e =>
	console.log(`[${getCurrentTime()}] Connection interrupted. (${e.error})`));

client.Dispatcher.on(Events.GATEWAY_RESUMED, () => {
	client.User.setStatus(config.hide ? 'invisible' : 'online');
	console.log(`[${getCurrentTime()}] Connection resumed.`);
});

// Guild-related

client.Dispatcher.on(Events.GUILD_CREATE, e => {
	logger.logToBoth('[GUILD_CREATE] ' + e.guild.name);
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
});*/

// Voice related

client.Dispatcher.on(Events.VOICE_CHANNEL_JOIN, e => 
	vcHandler.handle(e));