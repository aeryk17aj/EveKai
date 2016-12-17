const osu = require('node-osu');
const util = require('util');

const botUtil = require(process.cwd() + '/util/botUtil');
const auth = require(botUtil.getFromRoot('auth'));
const config = require(botUtil.getFromRoot('config'));

const osuApi = new osu.Api(auth.osuKey, {
	notFoundAsError: true,
	completeScores: false
});

const commaPad = s => botUtil.commaPad(s);

function respond (msg) {
	const msgText = msg.content;
	const msgChannel = msg.channel;

	const sendMessage = (s, e) => msgChannel.sendMessage(s, false, e);
	const sendEmbed = (e) => sendMessage('', e);

	// TODO new.ppy.sh listener
	// Sample: https://new.ppy.sh/beatmapsets/202661#osu/551348
	// var newPpyLink = /https?:\/\/new\.ppy\.sh\/beatmapsets\/(\d+)(?:#(?:osu|taiko|fruits|mania)\/(\d+))?/g;
	const beatmapLink = /https?:\/\/osu\.ppy\.sh\/([b|s])\/(\d+)/g;
	const isMapset = msgText.replace(beatmapLink, '$1') === 's';
	const id = msgText.replace(beatmapLink, '$2');
	const setFormat = '%s - %s (%s)';
	const mapFormat = '%s - %s [%s] ★ %f (%s)';
	if (beatmapLink.test(msgText)) {
		if (isMapset) {
			osuApi.getBeatmaps({ s: id }).then(beatmaps => {
				console.log('[s] Diffs: ' + beatmaps.length);
				const bmapset = beatmaps[0];
				const setString = util.format(setFormat,
					bmapset.artist,
					bmapset.title,
					bmapset.creator
				);
				const mapString = util.format(mapFormat,
					bmapset.artist,
					bmapset.title,
					bmapset.version,
					parseFloat(bmapset.difficulty.rating).toFixed(2),
					bmapset.creator
				);
				if (bmapset.length > 1) sendMessage(setString);
				else sendMessage(mapString);
			});
		} else {
			osuApi.getBeatmaps({ b: id }).then(beatmaps => {
				const bmap = beatmaps[0];
				const mapString = util.format(mapFormat, bmap.artist, bmap.title, bmap.version, bmap.creator);
				sendMessage(mapString);
			});
		}
	}

	const profileLookupArgs = msgText.replace(new RegExp('^' + config.prefix + 'osu ', 'g'), '').split(', ');
	let mode = 0;
	const modeNames = ['osu!', 'Taiko', 'Catch', 'Mania'];
	if (msgText.startsWith(config.prefix + 'osu')) {
		// Mode argument does not exist, default to osu!
		if (!profileLookupArgs[1]) mode = 0;
		// Mode exists, check for matching
		else if (isNaN(parseInt(profileLookupArgs[1]))) {
			switch (profileLookupArgs[1].toLowerCase()) {
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

		osuApi.getUser({ u: profileLookupArgs[0], m: mode }).then(user => {
			const perfects = parseInt(user.counts['300']);
			const closeOnes = parseInt(user.counts['100']);
			const almostMiss = parseInt(user.counts['50']);
			const totalHits = perfects + closeOnes + almostMiss;
			console.log([perfects, closeOnes, almostMiss, totalHits].join(', '));

			sendEmbed({
				color: 0xFFB2C5,
				thumbnail: {url: 'https://a.ppy.sh/' + user.id},
				url: 'https://osu.ppy.sh/u/' + user.id,
				author: {name: user.name, icon_url: 'https://a.ppy.sh/' + user.id},
				fields: [
					{
						name: 'Performance (' + modeNames[mode] + ')',
						value: [
							user.pp.raw + 'pp',
							'#' + user.pp.rank + ' World',
							'#' + user.pp.countryRank + ' ' + user.country
						].join('\n'),
						inline: true
					}, {
						name: 'Ranks',
						value: [
							'SS: ' + user.counts.SS,
							'S: ' + user.counts.S,
							'A: ' + user.counts.A
						].join(' | '),
						inline: true
					}, {
						name: 'Accuracy',
						value: [
							'Overall: ' + user.accuracy.slice(0, 5) + '%',
							[
								'300s: ' + commaPad(perfects),
								'100: ' + commaPad(closeOnes),
								'50s: ' + commaPad(almostMiss)
							].join(', '),
							'\t\t\t(' + [
								(perfects / totalHits).toFixed(2) + '%',
								(closeOnes / totalHits).toFixed(2) + '%',
								(almostMiss / totalHits).toFixed(2) + '%'
							].join('   /   ') + ')'
						].join('\n')
					}
				]
			});
		});
	}
}

exports.respond = respond;
