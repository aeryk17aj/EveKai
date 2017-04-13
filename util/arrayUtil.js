/**
 * Gets a random element from the given array
 * @param  {*[]} ar Any array
 * @return {*} Random element from input array
 */
function rInAr (ar) {
	return ar[Math.floor(Math.random() * ar.length)];
}

module.exports = { rInAr };
