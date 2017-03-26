const fs = require('fs');

const config = require('../config');
const userIds = require('../userIds');

/**
 * botUtil.js
 * These are my common functions for general use
 */

/**
 * Adds commas to every 3 characters / digits
 * @param  {*} s - Number or string
 * @return {string} - Now padded with commas
 */
function commaPad (s) {
	if (typeof s !== 'string') s = s.toString();
	return s.replace(/(\d)(?=(\d{3})+$)/g, '$1,');
}

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
 * Gets a random element from the given array
 * @param  {*[]} ar Any array
 * @return {*} Random element from input array
 */
function rInAr (ar) {
	return ar[Math.floor(Math.random() * ar.length)];
}

/**
 * Pads a string with backticks to be highlighed in Markdown
 * @param  {string} s input
 * @return {string} the input but padded with backticks
 * @example
 *   codeL('textGoesHere');
 *     > `textGoesHere`
 */
function codeL (s) {
	return '`' + s + '`';
}

/**
 * Pads a string with three backticks to be turned to a code block
 * @param  {(string|string[])} s input
 * @return {string} the input but padded with three backticks
 * @example 
 *   codeB('textGoesHere');
 *     > ```textGoesHere```
 * 
 *   codeB(['text', 'goes', here]);
 *     > ```
 *       text
 *       goes
 *       here
 *       ```
 */
function codeB (s) {
	return Array.isArray(s)
	// Array case
	? ['```', ...s, '```'].join('\n')
	// String case
	: '```' + s + '```';
}

function refreshConfig () {
	fs.writeFileSync('./config.json', JSON.stringify(config, null, 4), 'utf-8');
}

module.exports = {
	// Message utility
	senderIsOwner,
	// General utility
	commaPad, rInAr, codeL, codeB, refreshConfig
};
