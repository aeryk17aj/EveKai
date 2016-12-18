const userIds = require(getRootDir() + 'userIds');

/**
 * botUtil.js
 * These are my common functions for general use
 */

/**
 * Adds commas to every 3 characters / digits
 * @param  {[any, string]} s - Number or string
 * @return {string} - Now padded with commas
 */
function commaPad (s) {
	if (typeof s !== 'string') s = s.toString();
	return s.replace(/(\d)(?=(\d{3})+$)/g, '$1,');
}

/**
 * @access private
 */
function getRootDir () {
	return process.cwd() + '/';
}

/**
 * Gets a file from the root dir
 * @param  {string} s File name
 * @return {string} File path
 */
function getFromRoot (s) {
	return getRootDir() + s;
}

/**
 * Gets a plugin
 * @param  {string} s File name
 * @return {string} File path
 */
function getPlugin (s) {
	return getFromRoot('plugins/' + s);
}

/**
 * Gets a quote collection
 * @param  {string} s File name
 * @return {string} File path
 */
function getQuotes (s) {
	return getFromRoot('quotes/' + s);
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
 * @param  {any[]} ar Any array
 * @return {any} Random element from input array
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
 * @param  {[string, string[]]} s input
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
	// Array case
	if (s.constructor === Array) {
		// return ['```', ...s, '```'].join('\n'); // Soon
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
