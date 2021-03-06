const osu = require('node-osu');

const { commaPad } = require('../util/stringUtil');
const CommandHandler = require('../util/msgUtil');
const { getGeneralMapInfo, getDifficultyInfo, compareDifficulty } = require('../util/osuUtil');

const { prefix } = require('../config');

const osuApi = new osu.Api(process.env.OSU_KEY || require('../auth').osuKey, {
	notFoundAsError: true,
	completeScores: false
});

/**
 * @param {IMessage} msg
 * @returns void
 */
function respond (msg) {
	const { content: msgText } = msg;

	const sendMessage = (s, e) => msg.channel.sendMessage(s, false, e);
	const sendEmbed = (e) => sendMessage('', e);

	const { addCommandSentence } = new CommandHandler(msgText.slice(prefix.length));

	/**
	 * Group 1 `(\d+)` Set ID
	 *
	 * Group 2 `(\d+)` Map ID
	 */
	const newMapLink = /https?:\/\/osu\.ppy\.sh\/beatmapsets\/(\d+)(?:#(?:osu|taiko|fruits|mania)\/(\d+))?/g;

	/**
	 * Group 1 `([b|s])` Set/Map Indicator
	 *
	 * Group 2 `(\d+)` Set/Map ID
	 */
	const beatmapLink = /https?:\/\/osu\.ppy\.sh\/([b|s])\/(\d+)/g;

	const isNewMapLink = newMapLink.test(msgText);
	const linkMatches = beatmapLink.test(msgText) || isNewMapLink;
	const isMapset = msgText.replace(beatmapLink, '$1') === 's' || msgText.replace(newMapLink, '$2') === '';

	const id = isNewMapLink ? msgText.replace(newMapLink, isMapset ? '$1' : '$2') : msgText.replace(beatmapLink, '$2');

	if (linkMatches) {
		if (isMapset) {
			osuApi.getBeatmaps({ s: id }).then(beatmaps => {
				const msg = ['', {}];
				switch (beatmaps.length) {
					case 1:
						msg[0] = 'Found 1 map.'; break;
					case 2: case 3:
						msg[0] = `Found ${beatmaps.length} maps.`; break;
					default:
						msg[0] = `Found ${beatmaps.length} maps, but only displaying 3.`;
				}
				msg[1] = Object.assign(getGeneralMapInfo(beatmaps), {
					fields: beatmaps.sort(compareDifficulty).slice(-3).map(getDifficultyInfo)
				});
				sendMessage(...msg);
			});
		} else {
			osuApi.getBeatmaps({ b: id }).then(beatmaps => {
				sendEmbed(Object.assign(getGeneralMapInfo(beatmaps), {
					fields: [getDifficultyInfo(beatmaps[0])]
				}));
			});
		}
	}

	if (!msgText.startsWith(prefix)) return;

	addCommandSentence('osu', a => {
		const csArgs = a.split(', ');
		const userArg = csArgs[0];
		const modeArg = csArgs[1] || '';
		let mode = 0;

		// Mode argument does not exist, default to osu!standard
		if (!modeArg) mode = 0;
		// Mode exists, check for matching
		else if (isNaN(parseInt(modeArg))) {
			switch (modeArg.toLowerCase()) {
				case 'osu': case 'standard':
					mode = 0; break;
				case 'taiko': case 'tko':
					mode = 1; break;
				case 'ctb': case 'catch the beat': case 'catch':
					mode = 2; break;
				case 'mania':
					mode = 3; break;
				default:
					mode = 0;
			}
		// Mode argument does not have any match, default to osu!
		} else mode = 0;

		osuApi.getUser({ u: userArg, m: mode }).then(user => {
			const perfects = parseInt(user.counts['300']);
			const closeOnes = parseInt(user.counts['100']);
			const almostMiss = parseInt(user.counts['50']);
			const totalHits = perfects + closeOnes + almostMiss;

			sendEmbed({
				color: 0xFFB2C5,
				thumbnail: { url: 'https://a.ppy.sh/' + user.id },
				// url: 'https://osu.ppy.sh/u/' + user.id,
				author: { name: user.name, icon_url: 'https://a.ppy.sh/' + user.id },
				description: `Profile: [Current](https://osu.ppy.sh/u/${user.id}) | [New](https://osu.ppy.sh/users/${user.id})`,
				fields: [
					{
						name: `Performance (${['osu!', 'Taiko', 'Catch', 'Mania'][mode]})`,
						value: [
							`${user.pp.raw} pp`,
							`#${user.pp.rank} World`,
							`#${user.pp.countryRank} ${user.country}`
						].join('\n'),
						inline: true
					}, {
						name: 'Ranks',
						value: [
							'SS: ' + user.counts.SS,
							'S: ' + user.counts.S,
							'A: ' + user.counts.A
						].join('\n'),
						inline: true
					}, {
						name: 'Accuracy',
						value: [
							`Overall: ${user.accuracy.slice(0, 5)}%`,
							`300s: ${commaPad(perfects)}`,
							`100s: ${commaPad(closeOnes)}`,
							`50s: ${commaPad(almostMiss)}`
						].join('\n'),
						inline: true
					}, {
						name: 'Hit percentage',
						value: [ ' - - - - - ',
							`${(perfects / totalHits * 100).toFixed(2)}%`,
							`${(closeOnes / totalHits * 100).toFixed(2)}%`,
							`${(almostMiss / totalHits * 100).toFixed(2)}%`
						].join('\n'),
						inline: true
					}
				]
			});
		});
	});

	addCommandSentence('tvis', a => {
		sendMessage(a.replace(/k|d|K|D| /, b => {
			return {
				'k': '\u{1F535}',	// k -> blue circle
				'd': '\u{1F534}',	// d -> red circle
				'K': '(\u{1F535})',	// K -> blue circle in brackets
				'D': '(\u{1F534})',	// D -> red circle in brackets
				' ': '   '			// space x3
			}[b];
		}));
	});
}

exports.respond = respond;
