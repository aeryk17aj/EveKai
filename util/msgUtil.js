class CommandHandler {
	constructor (command) {
		this.command = command;
	}

	/**
	 * @summary Adds a command
	 * @param {string} c - Command string
	 * @param {Function} f - Callback function
	 */
	addCommand (c, f) {
		if (this.command === c) f();
	}

	/**
	 * @summary Adds a command that takes one, space-safe argument
	 * @param {string} c - Command string
	 * @param {Function} f - Callback function
	 */
	addCommandSentence (c, f) {
		if (this.command.startsWith(c)) {
			if (this.command[c.length] === ' ' || this.command[c.length] === undefined) f(this.command.slice(c.length + 1));
		}
	}

	/**
	 * @summary Adds a command that takes arguments separated by spaces
	 * @param {string} c Command string
	 * @param {Function} f Callback function
	 */
	addCommandArgs (c, f) {
		this.addCommandSentence(c, a => f(a.split(' ')));
	}
}

module.exports = CommandHandler;
