const fluentffmpeg = require('fluent-ffmpeg');
const ytdl = require('ytdl-core');
const YouTube = require('youtube-node');
const { Events } = require('discordie');

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const CommandHandler = require('../util/msgUtil');

const { prefix } = require('../config');
// const userIds = require('../userIds');

const yt = new YouTube();
yt.setKey(process.env.YT_KEY || require('../auth').yt);

let ffmpeg = null;

// Internal queue, stores position and id
const queue = {};

// Might have to implement some per-server config and states
let stopPlaying = false;

/** @type {ITextChannel | null} */
let boundTextChannel = null;
/** @type {IVoiceChannel | null} */
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
	const { content: msgText, member: sender, guild, channel: textChannel } = msg;
	if (!msgText.startsWith(prefix) || sender.bot) return;

	const command = msgText.slice(prefix.length);

	if (boundTextChannel && boundVoiceChannel) {
		// Ignore music commands except for bound channel
		if (boundTextChannel.id !== textChannel.id || sender.getVoiceChannel().id !== boundVoiceChannel.id) return;
	}

	const sendMessage = (m, e) => textChannel.sendMessage(m, false, e);
	const sendErrorMessage = (m, e) => sendMessage(m, e).then(m => setTimeout(m.delete, 3000);

	const { addCommand, addCommandSentence } = new CommandHandler(command);

	// Initialize queue
	if (!queue[guild.id]) queue[guild.id] = [];
	let guildQueue = queue[guild.id];

	// Check for some leftovers if on an empty queue
	if (!guildQueue.length) {
		guildQueue = fs.readdirSync(path.resolve(__dirname, './dl/' + guild.id + '/'))
			.filter(f => f.endsWith('.mp3'))
			.map(f => f.slice(0, f.lastIndexOf('.'))); // Doesn't need the extension
	}

	// addCommand('m init', initFolders);

	addCommand('join', () => {
		boundTextChannel = textChannel;
		const senderVc = sender.getVoiceChannel();
		if (!senderVc) return sendErrorMessage('You\'re not in a voice channel.');
		senderVc.join().then(() => {
			boundVoiceChannel = senderVc;
			sendMessage('Bound text channel `' + boundTextChannel.name + '` with voice channel `' + boundVoiceChannel.name + '`.');
			// initFolders();
		});
	});

	addCommand('leave', () => {
		const clientVc = client.User.getVoiceChannel(guild);
		stop(clientVc.getVoiceConnectionInfo().voiceConnection.getEncoder());
		if (!clientVc) return sendErrorMessage('Not in a voice channel.');
		else clientVc.leave();
		boundTextChannel = null;
		boundVoiceChannel = null;
	});

	function search (a, callback) {
		const linkBase = 'https://www.youtube.com/watch?v=';
		yt.search(a, 3, (err, res) => {
			if (err) return process.stdout.write(`${err}\n`);
			const links = res.items.map(i => linkBase + i.id.videoId);
			const titles = res.items.map(i => `${i.snippet.title} (${i.snippet.channelTitle})`);
			const songList = [
				'```ini', '[Search Results]', '',
				...titles.map((t, i) => `\t${(i + 1)} : ${t}`),
				'\tc : Cancel', '```'
			].join('\n');
			sendMessage(songList).then(() => {
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
						if (!canceled) callback(res, links, pick);
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
		search(a, (_, links, pick) => addToQueue(links[pick - 1]));
	}

	function searchOnly (a) {
		search(a, (res, links, pick) => {
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
	}

	['m f', 'search'].forEach(s => addCommandSentence(s, searchOnly));

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

		if (!validLink.test(a)) return searchThenAdd(a);
		else if (a.startsWith('http:')) return sendMessage('Make sure it\'s HTTPS');
		else {
			// Pre-download
			const vidId = a.slice(a.match(validLink)[0].length);
			busy = true;
			let smsg;

			// Download stream
			const downloadStream = ytdl(a, { filter: 'audioonly' });
			downloadStream.on('info', async i => {
				smsg = await sendMessage('Queuing: `' + i.title + '`. Don\'t play yet until ready.');
				if (i['length_seconds'] >= 15 * 60) sendMessage('The video is 15 minutes or longer. This might take a while.');
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

	function shuffle () {
		const a = guildQueue;
		for (let i = a.length; i; i--) {
			const j = Math.floor(Math.random() * i);
			[a[i - 1], a[j]] = [a[j], a[i - 1]];
		}
		return a;
	}

	['m sh', 'music shuffle', 'shuffle'].forEach(s => addCommandSentence(s, shuffle));

	function removeTrack (a) {
		const trackNumber = a; // Number(a);
		if (!trackNumber) 
			return sendErrorMessage('Not a valid track number.');
		else if (trackNumber > guildQueue.length) 
			return sendErrorMessage(`There are only ${guildQueue.length} songs in the queue.`);
		else {
			const deletedTrack = guildQueue.splice(trackNumber - 1, 1);
			fs.unlinkSync(path.resolve(__dirname, `./dl/${guild.id}/${deletedTrack}.mp3`));
		} // TODO: Also delete
	}

	['m r', 'music remove', 'remove'].forEach(s => addCommandSentence(s, removeTrack));

	function playMusic (a) {
		if (!guildQueue.length) return sendErrorMessage('There is nothing to play.');

		if (!a || !a.length) {
			const voiceChannel = client.User.getVoiceChannel(guild);
			/* if (!client.User.getVoiceChannel(guild)) return sendMessage('Not in a voice channel.');
			else */
			play(voiceChannel.getVoiceConnectionInfo());
		} else {
			play(voiceChannel.getVoiceConnectionInfo(), a);
		}
	}

	['m p', 'music play', 'play'].forEach(s => addCommandSentence(s, playMusic));

	function skip () {
		const encoder = client.VoiceConnections.find(vc => vc.voiceConnection.guild === guild).voiceConnection.getEncoder();
		if (encoder.disposed) return;
		encoder.kill();
		if (ffmpeg) {
			ffmpeg.kill();
			ffmpeg = null;
		}
		nextSong();
	}

	['m s', 'skip'].forEach(s => addCommand(s, skip));

	function toggleRepeatOne () {
		if (repeatOne) return sendErrorMessage('Already on.');
		else {
			return sendMessage('Okie').then(() => {
				repeatAll = false;
				repeatOne = true;
			});
		}
	}

	['m re one', 'repeat one'].forEach(s => addCommand(s, toggleRepeatOne));

	function toggleRepeatAll () {
		if (repeatAll) return sendErrorMessage('Already on.');
		else {
			return sendMessage('Okie').then(() => {
				repeatAll = true;
				repeatOne = false;
			});
		}
	}

	['m re all', 'repeat all'].forEach(s => addCommand(s, toggleRepeatAll));

	function repeatOff () {
		if (!(repeatOne || repeatAll)) {
			return sendErrorMessage('Not on repeat.');
		}
		else {
			return sendMessage('Okie').then(() => {
				repeatAll = false;
				repeatOne = false;
			});
		}
	}

	['m re off', 'repeat off'].forEach(s => addCommand(s, repeatOff));

	addCommand('stop', stop);
	addCommand('dc', stop); // Stops the ffmpeg process before terminating

	// TODO: Test this command more
	addCommand('clear', () => {
		guildQueue.forEach(songName => {
			fs.unlinkSync(path.resolve(__dirname, `./dl/${guild.id}/${songName}.mp3`));
			// guildQueue.shift();
		});

		guildQueue = []; // Clear after all are deleted
	});

	addCommand('list', () => {
		sendMessage('```ini\n[Song List]\n\n' + (guildQueue.map((s, i) => '\t ' + (i + 1) + ' : ' + s).join('\n') || '\tNothing but just us...') + '```');
	});

	addCommand('list2', () => {
		sendMessage('', {
			color: 0xEEDD33,
			title: 'Song List',
			description: guildQueue.map((s, i) => (i + 1) + ' : ' + s).join('\n') || 'Nothing but just us... /w\\'
		});
	});

	/**
	 * @param {VoiceConnectionInfo} vcInfo 
	 * @returns 
	 */
	function play (vcInfo, index) {
		stopPlaying = false;
		if (busy && !stopPlaying && guildQueue.length <= 1) 
			return sendErrorMessage('Still processing your request(s)...');

		const sampleRate = 48000;
		const channels = 2;
		const bitDepth = 16;

		const songName = guildQueue[index - 1 || 0];
		sendMessage('Now playing: `' + songName + '`');

		if (ffmpeg) ffmpeg.kill();
		ffmpeg = childProcess.spawn('ffmpeg', [
			'-re',
			'-i', path.resolve(__dirname, `./dl/${guild.id}/${songName}.mp3`),
			'-f', 's16le',
			'-ar', sampleRate,
			'-ac', channels,
			'-'
		], {stdio: ['pipe', 'pipe', 'ignore']});

		const _ffmpeg = ffmpeg;
		const ff_out = ffmpeg.stdout;

		const options = {
			frameDuration: 60,
			sampleRate: sampleRate,
			channels: channels,
			float: false
		};

		const readSize =
			sampleRate / 1000 *
			options.frameDuration *
			bitDepth / 8 *
			channels;

		ff_out.once('readable', () => {
			// if (!client.VoiceConnections.length) return console.log('Voice not connected');
			if (!vcInfo) vcInfo = client.VoiceConnections[0];
			const voiceConnection = vcInfo.voiceConnection;

			const encoder = voiceConnection.getEncoder(options);

			let { onNeedBuffer: needBuffer } = encoder;
			needBuffer = () => {
				const chunk = ff_out.read(readSize);

				if (_ffmpeg.killed) return;
				if (stopPlaying) return stop(encoder);

				if (!chunk) return setTimeout(needBuffer, options.frameDuration);

				const sampleCount = readSize / channels / (bitDepth / 8);
				encoder.enqueue(chunk, sampleCount);
			};

			needBuffer();
		});

		ff_out.once('end', nextSong);
	}

	function nextSong () {
		// Respect stop flag
		if (stopPlaying) return;

		/**
		 * No repeat: deletes first entry and moves on
		 * Repeat all: puts first back to last
		 * Repeat one: leaves queue untouched
		 */
		if (!(repeatOne || repeatAll)) { // If neither are on...
			const firstSongName = guildQueue.shift(); // ..remove from internal queue
			fs.unlinkSync(path.resolve(__dirname, `./dl/${guild.id}/${firstSongName}.mp3`)); // ...then delete the file
		} else if (repeatAll) guildQueue.push(guildQueue.shift()); // ...or else push the finished song to the back

		// Length check before attempting to play next track
		if (!guildQueue.length) stop(); // TODO: Start timer for inactivity
		else setTimeout(play, 100, client.User.getVoiceChannel(guild).getVoiceConnectionInfo()); // Play the next track
	}

	/**
	 * @param {AudioEncoder} encoder 
	 */
	function stop (encoder) {
		// Raise stop flag
		stopPlaying = true;

		// Kill encoder
		encoder.kill();

		// Kill reader process
		if (!ffmpeg) return;
		ffmpeg.kill();
		ffmpeg = null;
	}
}

exports.respond = respond;
