const botUtil = require('./botUtil');
const config = require(botUtil.getFromRoot('config'));

/**
 * @summary Adds a command
 * @param {IMessage} msg - Message object
 *   @see {@link https://qeled.github.io/discordie/#/docs/IMessage|IMessage}
 * @param {string} c - Command string
 * @param {Function} f - Callback function
 */
function addCommand (msg, c, f) {
	if (msg === config.prefix + c) f();
}

/**
 * @summary Adds a command that takes arguments separated by spaces
 * @param {IMessage} msg  Message object
 * @param {string}    c   Command string
 * @param {Function}  f   Callback function
 */
function addCommandArgs (msg, c, f) {
	const command = config.prefix + c + ' ';
	const args = msg.replace(new RegExp('^' + command + '(.+)'), '$1').split(' ');
	if (msg.startsWith(command) && msg !== command) f(args);
	else return; // Uncomment to run some debug stuff when sucessful
	// console.log(`Query: [${args.join(', ')}]`);
}

module.exports = {
	addCommand, addCommandArgs
};