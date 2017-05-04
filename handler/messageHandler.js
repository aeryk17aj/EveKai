// Handlers
const general = require('../plugins/general');
const logger = require('../plugins/logger');
const osu = require('../plugins/osu');
const music = require('../plugins/music');
const drawing = require('../plugins/drawing');
const special = require('../plugins/special');

const autoVcCommands = require('./vcHandler');

/**
 * Fired every time a message is received by the bot.
 * @param {Object} e Event object
 * @param {Discordie} client Bot client
 */
function handle (e, client) {
	if (!e) return;
	const msg = e.message;
	// TODO: Add idle mode, top priority listen
	logger.init(msg);
	general.respond(msg, client);
	if (!msg || !msg.content) return;
	osu.respond(msg);
	music.respond(msg, client);
	special.respond(msg, client);
	drawing.respond(msg, client);
	autoVcCommands.respond(msg);
}

exports.handle = handle;nt);
	special.respond(msg, client);
	drawing.respond(msg, client);
	autoVcCommands.respond(msg);
	// TODO: Separate prune command and put them here at the bottom
}

exports.handle = handle;
