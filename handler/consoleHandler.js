const CommandHandler = require('../util/msgUtil');
const util = require('../util/botUtil');
const logger = require('../plugins/logger');

// const config = require('../config');
let cg;
let ctc;

/**
 * Ahh the sweet land of no permission checks because the console is owner-only
 *
 * @param {string} msg
 */
function respond (msg, client) {
	const handler = new CommandHandler(msg);

	const { addCommand, addCommandSentence } = handler;

	addCommand('dc', () => {
		client.disconnect();
		process.exit(0);
	});

	addCommandSentence('sg', a => {
		const guilds = client.Guilds;
		const foundGuild = guilds.find(g => g.name === a);
		if (foundGuild) cg = foundGuild;
		else util.log(`Guild '${a}' not found.`);
		if (ctc) ctc = undefined;
	});

	addCommand('lsgtc', () => {
		if (!cg) util.log('No guild was set.');
		else util.log(cg.textChannels.map(tc => tc.name));
	});

	addCommandSentence('stc', a => {
		if (!cg) return util.log('Set a Guild first.');
		const tcs = cg.textChannels;
		const foundChannel = tcs.find(c => c.name === a);
		if (foundChannel) ctc = foundChannel;
		else util.log(`Text channel '${a}' not found in ${cg.name}.`);
	});

	addCommand('slr', () => {
		const latestMessage = client.Messages.toArray()[0];
		cg = latestMessage.guild;
		ctc = latestMessage.channel;
		util.log(`Focus set to: ${cg.name} - #${ctc.name}`);
	});

	addCommand('resetFocus', () => {
		cg = undefined; ctc = undefined;
	});

	addCommandSentence('say', a => {
		if (!cg || !ctc) return util.log('No set Guild and/or text channel.');
		else ctc.sendMessage(a);
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
				if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') util.log(result);
				else if (Array.isArray(result)) util.log(result.join(', '));
				// else util.log('Eval Success');
			}
		});
	});
}

exports.respond = respond;
