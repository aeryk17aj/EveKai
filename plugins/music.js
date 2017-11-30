const fluentffmpeg = require('fluent-ffmpeg');
const ytdl = require('ytdl-core');
const YouTube = require('youtube-node');
const { Events } = require('discordie');

const fs = require('fs');
const path = require('path');

const CommandHandler = require('../util/msgUtil');
const { log } = require('../util/botUtil');

const { prefix } = require('../config');

const yt = new YouTube();
yt.setKey(process.env.YT_KEY || require('../auth').yt);

// Internal queue, stores position and id
const queue = {};

/** @type {ITextChannel} */
let boundTextChannel = null;
/** @type {IVoiceChannel} */
let boundVoiceChannel = null;

let repeatOne = false;
let repeatAll = false;

let busy = false;

/**
 * @param {IMessage} msg
 * @param {Discordie} client
 * @returns void
 */
function respond (msg, client) {
	if (msg.isPrivate) return;
	const { content: msgText, channel: textChannel, guild, member: sender } = msg;
	if (!msgText.startsWith(prefix) || sender.bot) return;

	if (boundTextChannel && boundVoiceChannel)
		// Ignore music commands except for bound channel
		if (boundTextChannel.id !== textChannel.id || sender.getVoiceChannel().id !== boundVoiceChannel.id) return;

	const sendMessage = (m, e) => textChannel.sendMessage(m, false, e);
	const sendErrorMessage = (m, e) => sendMessage(m, e).then(m => setTimeout(() => m.delete(), 3000), () => {});

	const { addCommand, addCommandSentence }
		= new CommandHandler(msgText.slice(prefix.length));

	// Initialize queue
	if (!queue[guild.id]) queue[guild.id] = [];

	/** @type {Array<string>} */
	let guildQueue = queue[guild.id];

	// Check for some leftovers if on an empty queue
	if (!guildQueue.length) {
		const fileList = fs.readdirSync(path.resolve(__dirname, './dl/' + guild.id + '/'));
		if (fileList.length)
			guildQueue = fileList
				.filter(f => f.endsWith('.mp3'))
				.map(f => f.slice(0, f.lastIndexOf('.'))); // Doesn't need the extension
	}

	['m j', 'join'].forEach(s => addCommand(s, () => {
		const senderVc = sender.getVoiceChannel();
		if (!senderVc) return sendErrorMessage('You\'re not in a voice channel.');
		senderVc.join().then(() => {
			boundTextChannel = textChannel;
			boundVoiceChannel = senderVc;
			
			sendMessage(`Bound text channel \`${boundTextChannel.name}\` with voice channel \`${boundVoiceChannel.name}\`.`);
		});
	}));

	['m l', 'leave'].forEach(s => addCommand(s, () => {
		stop();

		const clientVc = client.User.getVoiceChannel(guild);
		if (!clientVc)
			return sendErrorMessage('Not in a voice channel.');
		else {
			clientVc.leave();
			boundTextChannel = null;
			boundVoiceChannel = null;
		}
	}));

	function search (a, callback) {
		yt.search(a, 3, (err, res) => {
			if (err) return log(`${err}\n`);
			const links = res.items.map(i => 'https://www.youtube.com/watch?v=' + i.id.videoId);
			const titleList = res.items.map((item, i) =>
				`\t${i + 1} : ${item.snippet.title} (${item.snippet.channelTitle})`);
			sendMessage([
				'```ini', '[Search Results]', '',
				...titleList,
				'\tc : Cancel', '```'
			].join('\n')).then(() => {
				let pick = 0;
				let canceled = false;
				function trackListener (e) {
					if (!e) return;
					const pickQuery = e.message.content;
					if (e.message.channel.id !== textChannel.id) return;
					else if (pickQuery === 'c') canceled = true;
					else if (pickQuery > 0 && pickQuery < 4) pick = parseInt(pickQuery);

					if (pick || canceled) {
						client.Dispatcher.removeListener(Events.MESSAGE_CREATE, trackListener);
						client.Dispatcher.emit(Events.MESSAGE_CREATE);
						if (!canceled) callback({res, links, pick});
					}
				}
				// Needs to listen more than once until it gets the right msg
				client.Dispatcher.on(Events.MESSAGE_CREATE, trackListener);
				if (pick || canceled) client.Dispatcher.emit(Events.MESSAGE_CREATE); // No need for a 2nd time
			});
		});
	}

	/**
	 * Takes a search term and calls `addToQueue` to process the chosen result
	 *
	 * @param {string} a Search term
	 */
	function searchThenAdd (a) {
		search(a, ({links, pick}) => addToQueue(links[pick - 1]));
	}

	['m f', 'search'].forEach(s => addCommandSentence(s, a => {
		search(a, ({res, links, pick}) => {
			const info = res.items[pick - 1].snippet;
			sendMessage('', {
				fields: [ {
					name: 'Uploader',
					value: `[${info.channelTitle}](${'https://www.youtube.com/channel/' + info.channelId})`
				}, {
					name: 'Video',
					value: `[${info.title}](${links[pick - 1]})`
				}, {
					name: 'Description',
					value: info.description
				} ],
				image: {
					url: info.thumbnails.high.url
				}
			});
		});
	}));

	/**
	 * Link case:
	 * 	Downloads and converts to a music file that's ready to be played
	 *
	 * Search case:
	 * 	Calls `search(a)`
	 *
	 * @param {string} a YouTube link or search term
	 * @returns
	 */
	function addToQueue (a) {
		// Channel check
		if (!client.User.getVoiceChannel(guild))
			return sendErrorMessage('Not in a voice channel.');

		const validLink = /https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?v=/;

		if (!validLink.test(a))
			return searchThenAdd(a);
		else if (a.startsWith('http:'))
			a = a.replace(/^http:/, 'https');
		else {
			// Pre-download
			const vidId = a.slice(a.match(validLink)[0].length);
			busy = true;
			let smsg;

			// Download stream
			const downloadStream = ytdl(a, { filter: 'audioonly' });
			downloadStream.on('info', async i => {
				smsg = await sendMessage('Queuing: `' + i.title + '`. Don\'t play yet until ready.');
				if (i['length_seconds'] >= 15 * 60)
					sendMessage('The video is 15 minutes or longer. This might take a while.');
				guildQueue.push(i.title.replace(/[\\/:*?"<>|]/g, '')); // File name safe
			});

			// Save to file
			const guildFolder = './dl/' + guild.id;
			const vidOut = path.resolve(__dirname, `${guildFolder}/_vid/${guildQueue.length + 1} - ${vidId}.mp4`);
			downloadStream.pipe(fs.createWriteStream(vidOut)).on('finish', () => {
				const mp3Out = path.resolve(__dirname, `${guildFolder}/${guildQueue[guildQueue.length - 1]}.mp3`);
				downloadStream.destroy();
				fluentffmpeg()
					.input(vidOut)
					.audioCodec('libmp3lame')
					.audioFilters('volume=0.3') // 1.0 is pretty loud
					.save(mp3Out)
					.on('end', () => {
						busy = false;
						fs.unlink(vidOut);
						smsg.edit('`' + guildQueue[guildQueue.length - 1] + '` is ready to be played.');
					});
			});
		}
	}

	['m q', 'music queue', 'add'].forEach(s => addCommandSentence(s, addToQueue));

	['m sh', 'music shuffle', 'shuffle'].forEach(s => addCommandSentence(s, () => {
		const a = guildQueue;
		for (let i = a.length; i; i--) {
			const j = Math.floor(Math.random() * i);
			[a[i - 1], a[j]] = [a[j], a[i - 1]];
		}
		return a;
	}));

	// TODO: Test more
	['m r', 'music remove', 'remove'].forEach(s => addCommandSentence(s, a => {
		if (!a)
			return sendErrorMessage('Not a valid track number.');
		else if (a > guildQueue.length)
			return sendErrorMessage(`There are only ${guildQueue.length} songs in the queue.`);
		else {
			const deletedTrack = guildQueue.splice(a - 1, 1);
			fs.unlinkSync(path.resolve(__dirname, `./dl/${guild.id}/${deletedTrack}.mp3`));
		}
	}));

	['m p', 'music play', 'play'].forEach(s => addCommandSentence(s, a => {
		if (!guildQueue.length)
			return sendErrorMessage('There is nothing to play.');

		const voiceChannel = client.User.getVoiceChannel(guild);

		if (!voiceChannel)
			return sendMessage('Not in a voice channel.');

		play(voiceChannel.getVoiceConnectionInfo(), Number(a));
	}));

	['m s', 'skip'].forEach(s => addCommand(s, () => {
		stop();
		nextSong();
	}));

	/**
	 * @param {string} a
	 * @returns Promise<IMessage>
	 */
	function repeatCommand (a) {
		const isAll = a === 'all';
		const isOne = a === 'one';

		if (a !== 'off') {
			if (isAll && repeatAll || isOne && repeatOne)
				return sendErrorMessage('Already on.');
			else return sendMessage('Ok').then(() => {
				repeatAll = isAll;
				repeatOne = isOne;
			});
		} else if (!(repeatOne || repeatAll))
			return sendErrorMessage('Not on repeat.');
	}

	['m re', 'repeat'].forEach(s => addCommandSentence(s, repeatCommand));

	addCommand('stop', stop);
	addCommand('dc', stop); // Unpipe before terminating

	// TODO: Test more
	addCommand('clear', () => {
		guildQueue.forEach(songName =>
			fs.unlinkSync(path.resolve(__dirname, `./dl/${guild.id}/${songName}.mp3`)));

		guildQueue = [];
	});

	addCommand('list', () => {
		sendMessage('', {
			color: 0xEEDD33,
			title: 'Song List',
			description: guildQueue.map((s, i) => `${i + 1} : ${s}`).join('\n') || 'Nothing but just us...'
		});
	});

	/**
	 * @param {VoiceConnectionInfo} vcInfo
	 * @param {number} index
	 * @returns {void}
	 */
	function play (vcInfo, index) {
		if (busy && guildQueue.length <= 1)
			return sendErrorMessage('Still processing your request(s)...');

		const songName = guildQueue[index ? index - 1 : 0];
		sendMessage(`Now playing \`${songName}\``);

		const encoder = vcInfo.voiceConnection.createExternalEncoder({
			type: 'ffmpeg',
			source: path.resolve(__dirname, `./dl/${guild.id}/${songName}.mp3`)
		});

		if (!encoder)
			return log('Voice connection is no longer valid.\n');

		encoder.play();
		encoder.once('end', nextSong);
	}

	function nextSong () {
		if (!(repeatOne || repeatAll)) {
			const firstSongName = guildQueue.shift();
			fs.unlinkSync(path.resolve(__dirname, `./dl/${guild.id}/${firstSongName}.mp3`));
		} else if (repeatAll) guildQueue.push(guildQueue.shift());

		if (!guildQueue.length) stop(); // TODO: Start timer for inactivity
		else setTimeout(play, 100, client.User.getVoiceChannel(guild).getVoiceConnectionInfo());
	}

	function stop () {
		const guildVc = client.VoiceConnections.getForGuild(guild);
		if (guildVc) guildVc
			.voiceConnection
			.getEncoderStream()
			.unpipeAll();
	}
}

exports.respond = respond;
