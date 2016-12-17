const userIds = require(getRootDir() + 'userIds');

/**
 * BOT UTIL
 * 
 * These are common utility functions I use on my js files.
 * 
 */

function commaPad (s) {
	if (typeof s !== 'string') s = s.toString();
	return s.replace(/(\d)(?=(\d{3})+$)/g, '$1,');
}

function getRootDir () {
	return process.cwd() + '/';
}

function getFromRoot (s) {
	return getRootDir() + s;
}

function getPlugin (s) {
	return getFromRoot('plugins/' + s);
}

function getQuotes (s) {
	return getFromRoot('quotes/' + s);
}

function senderIsOwner (msg) {
	const sender = msg.member || msg.author;
	const isAeryk = sender.id === userIds.aeryk || sender.id === userIds.eve;
	// if (!isAeryk) msg.channel.sendMessage('No');
	return isAeryk;
}

function rInAr (ar) {
	return ar[Math.floor(Math.random() * ar.length)];
}

function codeL (s) {
	return '`' + s + '`';
}

function codeB (s) {
	// Array case
	if (s.constructor === Array) {
		s.unshift('```');
		s.push('```');
		return s.join('\n');
	} else return '```' + s + '```'; // String case
}

module.exports = {
	// Module utility
	getFromRoot, getPlugin, getQuotes,
	// Message utility
	senderIsOwner,
	// General utility
	commaPad, rInAr, codeL, codeB
};
