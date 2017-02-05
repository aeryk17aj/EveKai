const botUtil = require('../util/botUtil');
const msgUtil = require('../util/msgUtil');
const logger = require(botUtil.getPlugin('logger'));

const config = require('../config');

/**
 * Ahh the sweet land of no permission checks because the console is owner-only
 */
function respond (msg, client) {
	const possibleCommand = msg.startsWith(config.prefix);
	if (!possibleCommand) return;

	const addCommand = (c, f) => msgUtil.addCommand(msg, c, f);
	const addCommandArgs = (c, f) => msgUtil.addCommandArgs(msg, c, f);
	const addCommandSentence = (c, f) => addCommandArgs(c, a => f(a.join(' ')));

	addCommand('dc', () => {
		client.disconnect();
		process.exit(0);
	});

	addCommandSentence('eval', a => {
		let result;
		return new Promise(resolve => {
			result = eval(a);
			resolve('Success');
		}).catch(() => {
			logger.logToBoth('[System] Evaluation error');
		}).then(v => {
			if (v === 'Success') {
				if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') console.log(result);
				else if (Array.isArray(result)) console.log(result.join(', '));
				else console.log('Eval Success');
			}
		});
	});
}

exports.respond = respond;