/**
 * Gets a random element from the given array
 * @param  {*[]} ar Any array
 * @return {*} Random element from input array
 */
function rInAr (ar) {
	return ar[Math.floor(Math.random() * ar.length)];
}

function shuffle (a) {
	for (let i = a.length; i; i--) {
		const j = Math.floor(Math.random() * i);
		[a[i - 1], a[j]] = [a[j], a[i - 1]];
	}
	return a;
}

/**
 * Splits an array into chunks of sub-arrays based on the given chunk length
 * @param  {*[]} a Any array
 * @param  {number} s number of elements per chunk
 * @return {*[][]} the chunked array
 */
function chunk (a, s) {
	const _a = [];

	for (let i = 0; i < a.length; i += s)
		if (i % s === 0)
			_a.push(a.slice(i, Math.min(i + s, a.length)));

	return _a;

	// return a.map((e, i) => i % s ? null : a.slice(i, i + s)).filter(e => e);
}

module.exports = { rInAr, shuffle, chunk };
