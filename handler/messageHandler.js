// Bot: General
const general = require('../plugins/general');
const logger = require('../plugins/logger');
const music = require('../plugins/music');

// Bot: Extra
const drawing = require('../plugins/drawing');
const special = require('../plugins/special');
const autoVcCommands = require('./vcHandler');
const prune = require('../plugins/pruneCommand');

// Game-related
const osu = require('../plugins/osu');

/**
 * Fired every time a message is received by the bot.
 * @param {{msg: IMessage}} e Event object
 * @param {Discordie} client Bot client
 */
function handle (e, client) {
	if (!e) return;
	const msg = e.message;
	if (!msg || !msg.content) return;

	const handlers = [
		logger,
		general,
		osu,
		music,
		special,
		drawing,
		autoVcCommands,
		prune
	];

	for (const h of handlers)
		h.respond(msg, client);
}

exports.handle = handle;
