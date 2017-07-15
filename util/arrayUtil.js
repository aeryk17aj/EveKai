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
 * Gets a random element from the given array
 * @param  {*[]} a Any array
 * @param  {number} s Any array
 * @return {*[][]} Random element from input array
 */
function chunk (a, s) {
	return a.map((e, i) => i % s ? null : a.slice(i, i + s)).filter(e => e);
}

module.exports = { rInAr, shuffle, chunk };
