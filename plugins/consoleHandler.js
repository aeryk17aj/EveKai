const msgUtil = require(process.cwd() + '/util/msgUtil');
const config = require('../config');

/**
 * Ahh the sweet land of no permission checks because the console is owner-only
 */
function respond (msg, client) {
	const possibleCommand = msg.startsWith(config.prefix);
	if (!possibleCommand) return;

	const addCommand = (c, f) => msgUtil.addCommand(msg, c, f);

	addCommand('dc', () => {
		client.disconnect();
		process.exit(0);
	});
}

exports.respond = respond;