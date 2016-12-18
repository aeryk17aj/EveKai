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
	const args = msg.replace(new RegExp(`^${c} .+`), '').split(' ');
	if (msg.startsWith(config.prefix + c)) f(args);
}

module.exports = {
	addCommand, addCommandArgs
};