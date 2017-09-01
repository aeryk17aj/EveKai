const CommandHandler = require('../util/msgUtil');
const { log } = require('../util/botUtil');
const logger = require('../plugins/logger');

// const config = require('../config');
/** @type {IGuild | undefined} */
let cg;
/** @type {ITextChannel | undefined} */
let ctc;

/**
 * Ahh the sweet land of no permission checks because the console is owner-only
 *
 * @param {string} msg
 * @param {Discordie} client
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
		else log(`Guild '${a}' not found.`);
		if (ctc) ctc = undefined;
	});

	addCommand('lsgtc', () => {
		if (!cg) log('No guild was set.');
		else log(cg.textChannels.map(tc => tc.name));
	});

	addCommandSentence('stc', a => {
		if (!cg) return log('Set a Guild first.');
		const tcs = cg.textChannels;
		const foundChannel = tcs.find(c => c.name === a);
		if (foundChannel) ctc = foundChannel;
		else log(`Text channel '${a}' not found in ${cg.name}.`);
	});

	addCommand('slr', () => {
		const latestMessage = client.Messages.toArray()[0];
		cg = latestMessage.guild;
		ctc = latestMessage.channel;
		log(`Focus set to: ${cg.name} - #${ctc.name}`);
	});

	addCommand('resetFocus', () => {
		cg = undefined; ctc = undefined;
	});

	addCommandSentence('say', a => {
		if (!cg || !ctc) return log('[readline] No set Guild and/or text channel.');
		else ctc.sendMessage(a);
	});

	addCommandSentence('eval', a => {
		let result;
		return new Promise(resolve => {
			result = eval(a);
			resolve();
		}).catch(() => {
			logger.logToBoth('[readline] Evaluation error');
		}).then(() => {
			switch (typeof result) {
				case 'string': case 'number': case 'boolean':
					log(result); break;
				default:
					if (Array.isArray(result)) log(result.join(', '));
			}
		});
	});
}

exports.respond = respond;
