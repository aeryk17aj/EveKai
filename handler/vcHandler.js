const fs = require('fs');

const CommandHandler = require('../util/msgUtil');

/**
 * @typedef Configuration
 * @type {object}
 * @property {string} prefix - The bot's prefix
*/

/** @type {Configuration} */
const config = require('../config');

/** @type {string[]} */
const autoVcWl = require('../autovc');

function handle (e) {
	const user = e.user;
	if (!user.gameName || user.bot) return;
	const guild = e.channel.guild;
	const member = user.memberOf(guild);

	const gameVc = guild.voiceChannels.find(vc => vc.name === user.gameName);

	if (!autoVcWl.includes(guild.id) || !gameVc) return;

	else if (member.getVoiceChannel().name !== user.gameName) member.setChannel(gameVc);
}

function respond (msg) {
	const keyword = 'autovc';
	if (!msg.content.startsWith(config.prefix + keyword)) return;
	const handler = new CommandHandler(msg.content.slice((config.prefix + keyword).length + 1));
	const { addCommand } = handler;

	addCommand('on', () => {
		autoVcWl.push(msg.guild.id);
		updateWl();
	});

	addCommand('off', () => {
		autoVcWl.shift(msg.guild.id);
		updateWl();
	});

	function updateWl () {
		fs.writeFileSync('./autovc.json', JSON.stringify(autoVcWl, null, 4), 'utf-8');
	}
}

module.exports = {
	handle, respond
};
