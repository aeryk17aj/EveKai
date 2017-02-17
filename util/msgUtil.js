const config = require('../config');

class CommandHandler {
	constructor (command) {
		this.command = command;
	}

	/**
	 * @summary Adds a command
	 * @param {string} msg - Message object
	 *   @see {@link https://qeled.github.io/discordie/#/docs/IMessage |IMessage}
	 * @param {string} c - Command string
	 * @param {Function} f - Callback function
	 */
	addCommand (c, f) {
		if (this.command === c) f();
	}

	addCommandSentence (c, f) {
		if (this.command.startsWith(c)) {
			// if (this.command.length > c.length)
			if (this.command[c.length] === ' ' || this.command[c.length] === undefined) f(this.command.slice(c.length + 1));
		}
	}

	/**
	 * @summary Adds a command that takes arguments separated by spaces
	 * @param {string} msg Message object
	 * @param {string} c Command string
	 * @param {Function} f Callback function
	 */
	addCommandArgs (c, f) {
		this.addCommandSentence(c, a => f(a.split(' ')));
	}
}

module.exports = CommandHandler;
