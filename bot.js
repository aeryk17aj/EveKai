// Dependencies
const Discordie = require('discordie');
const readline = require('readline');

// Plugins
const consoleHandler = require('./plugins/consoleHandler');
const messageHandler = require('./plugins/messageHandler');
const logger = require('./plugins/logger');
const osu = require('./plugins/osu');
const cleverbot = require('./plugins/cleverbot');
const music = require('./plugins/music');

// External JSON files
const auth = require('./auth');
const config = require('./config');

const Events = Discordie.Events;
const client = new Discordie({
	autoReconnect: true
});
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

rl.on('line', c => {
	// const possibleCommand = c.startsWith(config.prefix);
	// if (!possibleCommand) return;
	consoleHandler.respond(c, client);
});

client.connect({ token: auth.loginToken });

client.Dispatcher.on(Events.GATEWAY_READY, e => { // eslint-disable-line no-unused-vars
	client.User.setGame('with a new version');
	client.User.setStatus(config.idleMode ? 'idle' : 'online');
	console.log('[System] Connected.');
});

client.Dispatcher.on(Events.DISCONNECTED, err => console.log(`[System] Connection interrupted. (${err})`));
client.Dispatcher.on(Events.GATEWAY_RESUMED, () => console.log('[System] Connection resumed.'));

/**
 * Fired every time a message is received by the bot.
 * @param {Object} e Event object
 */
function onMessageCreate (e) {
	const msg = e.message;
	// logger.init(msg);
	messageHandler.respond(msg, client);
	// osu.respond(msg);
	// cleverbot.init(msg, client);
	music.respond(msg, client);
}

client.Dispatcher.on(Events.MESSAGE_CREATE, onMessageCreate);

/**
 * TODO
 *
 * Finish Message Handler (aka port over every command)
 * Image map: "filename": [alias1, alias2]
 */
