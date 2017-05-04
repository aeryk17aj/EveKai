// Handlers
const general = require('../plugins/general');
const logger = require('../plugins/logger');
const osu = require('../plugins/osu');
const music = require('../plugins/music');
const drawing = require('../plugins/drawing');
const special = require('../plugins/special');

const autoVcCommands = require('./vcHandler');

/** @typedef IMessage */
/** @typedef Discordie */
/** @typedef MessageCreateEvent
 * 		@prop {IMessage} message Event Message*/

/**
 * Fired every time a message is received by the bot.
 * @param {MessageCreateEvent} e Event object
 * @param {Discordie} client Bot client
 */
function handle (e, client) {
	if (!e) return;
	const msg = e.message;
	logger.init(msg);
	general.respond(msg, client);
	if (!msg || !msg.content) return;
	osu.respond(msg);
	music.respond(msg, client);
	special.respond(msg, client);
	drawing.respond(msg, client);
	autoVcCommands.respond(msg);
	// TODO: Separate prune command and put them here at the bottom
}

exports.handle = handle;
