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

module.exports = {
	commaPad, codeL, codeB
};
