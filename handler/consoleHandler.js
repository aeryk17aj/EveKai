const CommandHandler = require('../util/msgUtil');
const logger = require('../plugins/logger');

const config = require('../config');

/**
 * Ahh the sweet land of no permission checks because the console is owner-only
 * 
 * @param {string} msg 
 */
function respond (msg, client) {
	const handler = new CommandHandler(msg);

	const addCommand = (c, f) => handler.addCommand(c, f);
	//const addCommandArgs = handler.addCommandArgs;
	const addCommandSentence = (c, f) => handler.addCommandSentence(c, f);

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
