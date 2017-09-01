/**
 * Provides a part of an embed object with general information of the mapset.
 *
 * @param {Beatmap[]} set
 * @returns {{ color: number, thumbnail: { url: string }, title: string, description: string}}
 */
function getGeneralMapInfo (set) {
	const diff = set[0];
	return {
		color: 0xFFB2C5,
		thumbnail: { url: `http://b.ppy.sh/thumb/${diff.beatmapSetId}l.jpg` },
		title: util.format('%s - %s by %s',
			diff.artist,
			diff.title,
			diff.creator),
		description: util.format('**Length**: %s **BPM**: %s\n**Tags**: %s\n-------------------',
			diff.time.total, diff.bpm, diff.tags.join(' '))
	};
}

/**
 * Provides a field object in an embed containing difficulty info.
 *
 * @param {Beatmap} diff
 * @returns {{ name: string, value: string }}
 */
function getDifficultyInfo (diff) {
	return {
		name: `__${diff.version}__`,
		value: [
			`**Difficulty**: ${parseFloat(diff.difficulty.rating).toFixed(2)}★ `,
			`**Max Combo**: x${diff.maxCombo}\n`,
			`**AR**: ${diff.difficulty.approach} `,
			`**OD**: ${diff.difficulty.overall} `,
			`**HP**: ${diff.difficulty.drain} `,
			`**CS**: ${diff.difficulty.size}`
		].map(a => '▸' + a).join('')
	};
}

/**
 * Used for sorting a beatmap array basead on star difficulty, easiest to hardest
 * 
 * @param {any} a 
 * @param {any} b 
 * @returns 
 */
function compareDifficulty (a, b) {
	const sr1 = parseFloat(a.difficulty.rating);
	const sr2 = parseFloat(b.difficulty.rating);

	if (sr1 > sr2) return 1;
	else if (sr1 < sr2) return -1;
	else return 0;
}

module.exports = {
	getGeneralMapInfo,
	getDifficultyInfo,
	compareDifficulty
}