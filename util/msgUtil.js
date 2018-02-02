class CommandHandler {
	/**
	 * Creates an instance of CommandHandler
	 * @param {string} command
	 *
	 * @memberOf CommandHandler
	 */
	constructor (command) {
		this.command = command;
		[
			'addCommand',
			'addCommandSentence',
			'addCommandArgs'
		].forEach(f => {
			this[f] = this[f].bind(this);
		});
	}

	/**
	 * Adds a command
	 *
	 * @param {string} c - Command string
	 * @param {Function} f - Callback function
	 *
	 * @memberOf CommandHandler
	 */
	addCommand (c, f) {
		if (this.command === c) f();
	}

	/**
	 * Adds a command that takes one, space-safe argument
	 *
	 * @param {string} c - Command string
	 * @param {(a: string) => void} f - Callback function
	 *
	 * @memberOf CommandHandler
	 */
	addCommandSentence (c, f) {
		if (this.command.startsWith(c)) {
			if (this.command[c.length] === ' ' || // There's a space, ergo another word
				this.command[c.length] === undefined) // Nothing, supporting optional arguments
				f(this.command.slice(c.length + 1));
		}
	}

	/**
	 * Adds a command that takes arguments separated by spaces
	 *
	 * @param {string} c Command string
	 * @param {(a: string[]) => void} f Callback function
	 *
	 * @memberOf CommandHandler
	 */
	addCommandArgs (c, f) {
		this.addCommandSentence(c, a => f(a.split(' ')));
	}
}

module.exports = CommandHandler;
