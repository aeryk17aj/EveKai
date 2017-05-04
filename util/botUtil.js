const fs = require('fs');
const resolve = require('path').resolve;

const userIds = require('../userIds');

/**
 * @param  {IMessage} msg Message object
 * @return {boolean} whether the message sender has access
 */
function senderIsOwner (msg) {
	const sender = msg.member || msg.author;
	const isAeryk = sender.id === userIds.aeryk || sender.id === userIds.eve;
	return isAeryk;
}

/**
 * @access private
 * @param {string} path
 */
function makeGuildFolder (path) {
	fs.mkdirSync(path);
	fs.mkdirSync(path + '/_vid');
	fs.mkdirSync(path + '/_img');
}

/**
 * Makes a folder for storing music, pre-converted videos and cached avatars
 * 
 * @param {Discordie} client
 */
function ensureFoldersExist (client) {
	client.Guilds.forEach(g => {
		const guildFolder = resolve(__dirname, `../plugins/dl/${g.id}`);
		if (!fs.existsSync(guildFolder)) {
			makeGuildFolder(guildFolder);
			console.log('Created folders for: ' + g.name);
		}
	});
}

module.exports = {
	// Message utility
	senderIsOwner,
	// General utility
	ensureFoldersExist
};
