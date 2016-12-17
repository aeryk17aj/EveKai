// Dependencies
const Discordie = require('discordie');

// Plugins
const messageHandler = require('./plugins/messageHandler');
const logger = require('./plugins/logger');
const osu = require('./plugins/osu');

// External JSON files
const auth = require('./auth');
const config = require('./config');

const Events = Discordie.Events;
const client = new Discordie({
	autoReconnect: true
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
 * @param  Events.MESSAGE_CREATE e Event object
 */
function onMessageCreate (e) {
	const msg = e.message;
	logger.init(msg);
	messageHandler.respond(msg, client);
	osu.respond(msg);
}

client.Dispatcher.on(Events.MESSAGE_CREATE, onMessageCreate);

exports.onMessageCreate = onMessageCreate;

/**
 * TODO
 *
 * Finish Message Handler
 * Add methods using the client object
 * 	Cleverbot - anti-self-response
 * 	Master Access check to include self
 * 		Alternative, store bot id
 */
