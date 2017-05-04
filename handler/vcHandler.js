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
	const vc = e.channel;
	const guild = e.channel.guild;
	const member = user.memberOf(guild);

	const gameVc = guild.voiceChannels.find(vc => vc.name === user.gameName);

	if (!autoVcWl.includes(guild.id)) return;

	if (!gameVc) return;
	else if (member.getVoiceChannel().name !== user.gameName) member.setChannel(gameVc);
}

function respond (msg) {
	const handler = new CommandHandler(msg.content.slice((config.prefix + 'autovc ').length));
	if (!msg.content.startsWith(config.prefix)) return; 

	handler.addCommand('on', () => {
		autoVcWl.push(msg.guild.id);
		updateWl();
	});

	handler.addCommand('off', () => {
		autoVcWl.shift(msg.guild.id);
		updateWl();
	});

	function updateWl() {
		fs.writeFileSync('./autovc.json', JSON.stringify(autoVcWl, null, 4), 'utf-8');
	}
}

module.exports = {
	handle, respond
};
