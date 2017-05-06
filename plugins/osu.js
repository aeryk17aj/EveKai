const osu = require('node-osu');
const util = require('util');

const stringUtil = require('../util/stringUtil');
const CommandHandler = require('../util/msgUtil');

const config = require('../config');

const osuApi = new osu.Api(process.env.OSU_KEY || require('../auth').osuKey, {
	notFoundAsError: true,
	completeScores: false
});

const commaPad = s => stringUtil.commaPad(s);

function respond (msg) {
	const msgText = msg.content;
	if (!msgText.startsWith(config.prefix)) return;
	const msgChannel = msg.channel;

	const sendMessage = (s, e) => msgChannel.sendMessage(s, false, e);
	const sendEmbed = (e) => sendMessage('', e);

	const command = msgText.slice(config.prefix.length);
	const handler = new CommandHandler(command);

	const addCommandSentence = (c, f) => handler.addCommandSentence(c, f);

	/**
	 * $1 (\d+) Set ID
	 * $2 (\d+) Map ID
	 */
	const newMapLink = /https?:\/\/new\.ppy\.sh\/beatmapsets\/(\d+)(?:#(?:osu|taiko|fruits|mania)\/(\d+))?/g;

	/**
	 * $1 ([b|s]) Set/Map Indicator
	 * $2 (\d+) Set/Map ID
	 */
	const beatmapLink = /https?:\/\/osu\.ppy\.sh\/([b|s])\/(\d+)/g;

	const isNewMapLink = newMapLink.test(msgText);
	const linkMatches = beatmapLink.test(msgText) || isNewMapLink;
	const isMapset = msgText.replace(beatmapLink, '$1') === 's' || msgText.replace(newMapLink, '$2') === '';

	const id = isNewMapLink ? msgText.replace(newMapLink, isMapset ? '$1' : '$2') : msgText.replace(beatmapLink, '$2');

	const setFormat = '%s - %s (%s)';
	const mapFormat = '%s - %s [%s] ★ %d (%s)';
	if (linkMatches) {
		if (isMapset) {
			osuApi.getBeatmaps({ s: id }).then(beatmaps => {
				console.log('[s] Diffs: ' + beatmaps.length);
				const mapSet = beatmaps[0];
				const setString = util.format(setFormat,
					mapSet.artist,
					mapSet.title,
					mapSet.creator
				);
				const mapString = util.format(mapFormat,
					mapSet.artist,
					mapSet.title,
					mapSet.version,
					parseFloat(mapSet.difficulty.rating).toFixed(2),
					mapSet.creator
				);
				if (mapSet.length > 1) sendMessage(setString);
				else sendMessage(mapString);
			});
		} else {
			osuApi.getBeatmaps({ b: id }).then(beatmaps => {
				const bMap = beatmaps[0];
				const mapString = util.format(mapFormat, bMap.artist, bMap.title, bMap.version, parseFloat(bMap.difficulty.rating).toFixed(2), bMap.creator);
				sendMessage(mapString);
			});
		}
	}

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
				thumbnail: {url: 'https://a.ppy.sh/' + user.id},
				url: 'https://osu.ppy.sh/u/' + user.id,
				author: {name: user.name, icon_url: 'https://a.ppy.sh/' + user.id},
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
		const converted = a
		.replace(/k/g, '\u{1F535}') // k -> blue circle
		.replace(/d/g, '\u{1F534}') // d -> red circle
		.replace(/K/g, '(\u{1F535})') // K -> blue circle in brackets
		.replace(/D/g, '(\u{1F534})') // D -> red circle in brackets
		.replace(/ /g, '   '); // space x3
		sendMessage(converted);
	});
}

exports.respond = respond;
// module.exports = respond;
