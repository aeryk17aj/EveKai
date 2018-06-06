/**
 * botUtil.js
 * These are my common functions for general use
 */

/**
 * Adds commas to every 3 characters / digits
 * @param  {number|string} s - Number or string
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
	return `\`${s}\``;
}

/**
 * Pads a string with three backticks to be turned to a code block
 * @param  {(string|string[])} s input
 * @return {string} the input but padded with three backticks
 */
function codeB (s) {
	return Array.isArray(s)
		// Array case
		? ['```', ...s, '```'].join('\n')
		// String case
		: `\`\`\`${s}\`\`\``;
}

/**
 * Gets codepoint from a unicode character in the form of a string
 * @param {string} a Input unicode character
 * @returns string the found codepoint
 */
function getCodePoint (a) {
	a = a.replace(/\ufe0f|\u200d/gm, ''); // strips unicode variation selector and zero-width joiner
	const r = [];
	let index = 0;
	let currentChar = 0;
	let p = 0;
	while (index < a.length) {
		currentChar = a.charCodeAt(index++);
		if (p) {
			r.push((65536 + (p - 55296 << 10) + (currentChar - 56320)).toString(16));
			p = 0;
		} else if (55296 <= currentChar && currentChar <= 56319) p = currentChar;
		else r.push(currentChar.toString(16));
	}

	return r.join('-');
}

module.exports = {
	commaPad, codeL, codeB, getCodePoint
};
