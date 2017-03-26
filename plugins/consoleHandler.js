const botUtil = require('../util/botUtil');
const client = require('../bot').client;
const CommandHandler = require('../util/msgUtil');
const logger = require(botUtil.getPlugin('logger'));

const config = require('../config');

/**
 * Ahh the sweet land of no permission checks because the console is owner-only
 * 
 * @param {string} msg 
 */
function respond (msg) {
	const handler = new CommandHandler(msg);

	const addCommand = handler.addCommand;
	//const addCommandArgs = handler.addCommandArgs;
	const addCommandSentence = handler.addCommandSentence;

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
