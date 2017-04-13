// Dependencies
const Discordie = require('discordie');
const readline = require('readline');
const fs = require('fs');
const resolve = require('path').resolve;

// Handlers
const consoleHandler = require('./handler/consoleHandler');
const messageHandler = require('./handler/messageHandler');
const logger = require('./plugins/logger');

// Utility
const util = require('./util/botUtil');

// Config
const config = require('./config');

const Events = Discordie.Events;
const client = new Discordie({
	autoReconnect: true
});
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

rl.on('line', c =>
	consoleHandler.respond(c, client));

client.connect({ token: process.env.BOT_TOKEN || require('./auth').loginToken });

// Connection-related

client.Dispatcher.on(Events.GATEWAY_READY, e => { // eslint-disable-line no-unused-vars
	client.User.setGame('with new discoveries');
	client.User.setStatus(config.idleMode ? 'idle' : 'online');
	console.log('[Startup] Checking music folders...');
	util.ensureFoldersExist(client);
	console.log('[Startup] Connected.');
});

client.Dispatcher.on(Events.DISCONNECTED, e =>
	console.log(`[${getCurrentTime()}] Connection interrupted. (${e.error})`));

client.Dispatcher.on(Events.GATEWAY_RESUMED, () =>
	console.log(`[${getCurrentTime()}] Connection resumed.`));

// Guild-related

client.Dispatcher.on(Events.GUILD_CREATE, e => {
	logger.logToBoth('[GUILD_CREATE] ' + e.guild.name);
});

client.Dispatcher.on(Events.GUILD_MEMBER_ADD, e =>
	e.guild.generalChannel.sendMessage(`Welcome, **${e.member.name}** to **${e.guild.name}**.`));

client.Dispatcher.on(Events.GUILD_MEMBER_REMOVE, e =>
	e.guild.generalChannel.sendMessage(`**${e.user.username}** has left **${e.guild.name}**.`));

// Message related

client.Dispatcher.on(Events.MESSAGE_CREATE, e =>
	messageHandler.handle(e, client));

function getCurrentTime () {
	return new Date(Date.now()).toLocaleString('en-US');
}