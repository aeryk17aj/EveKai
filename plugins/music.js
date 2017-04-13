const fluentffmpeg = require('fluent-ffmpeg');
const ytdl = require('ytdl-core');
const YouTube = require('youtube-node');
const Events = require('discordie').Events;

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const CommandHandler = require('../util/msgUtil');

const config = require('../config');
const userIds = require('../userIds');

const yt = new YouTube();
yt.setKey(process.env.YT_KEY || require('../auth').yt);

// Internal queue, stores position and id
const queue = {};
let guildQueue = [];
let stopPlaying = false;
let ffmpeg = null;

let boundTextChannel = null;
let boundVoiceChannel = null;

let repeatOne = false;
let repeatAll = false;

let busy = false;

function respond (msg, client) {
	if (msg.isPrivate) return;
	const msgText = msg.content;
	if (!msgText.startsWith(config.prefix)) return;
	const command = msgText.slice(config.prefix.length);
	const sender = msg.member;
	if (sender.bot) return;

	if (boundTextChannel && boundVoiceChannel) {
		// Ignore music commands except for bound channel
		if (boundTextChannel.id !== msg.channel.id || sender.getVoiceChannel().id !== boundVoiceChannel.id) return;
	}

	const isOwner = sender.id === userIds.aeryk;
	const handler = new CommandHandler(command);
	const sendMessage = (m, e) => msg.channel.sendMessage(m, false, e);

	const addCommand = (c, f) => handler.addCommand(c, f);
	const addCommandSentence = (c, f) => handler.addCommandSentence(c, f);

	if(!fs.existsSync(path.resolve(__dirname, './dl/' + msg.guild.id))) initFolders();

	// Initialize queue
	if (!queue[msg.guild.id]) queue[msg.guild.id] = [];
	guildQueue = queue[msg.guild.id];

	// Check for some leftovers if on an empty queue
	if (!guildQueue.length) {
		guildQueue = fs.readdirSync(path.resolve(__dirname, './dl/' + msg.guild.id + '/'))
			.filter(f => f.slice(-4) === '.mp3')
			.map(f => f.slice(0, f.lastIndexOf('.'))); // Doesn't need the extension
	}

	// Only because I want to check things in this place specifically
	addCommandSentence('evalM', a => {
		if (!isOwner) return;
		if (a === 'e.message.content' || a === 'msgText') return;

		let result;
		return new Promise(resolve => {
			result = eval(a);
			resolve('Success'); // If it got to this point, it might as well work
		}).catch(e => {
			// sendMessage('\u{1F52B}'); // Peestol
			console.log(e);
			sendMessage('It didn\'t work.');
		}).then(v => {
			if (v === 'Success') {
				if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') sendMessage(result);
				else if (Array.isArray(result)) sendMessage(result.join(', '));
				// else sendMessage('\u{1F44C}'); // Ok hand sign
			}
		});
	});

	function initFolders () {
		// Initialize folders
		const guildFolder = './dl/' + msg.guild.id;
		const fullPath = path.resolve(__dirname, guildFolder);
		if (!fs.existsSync(fullPath)) {
			//fs.mkdirSync(path.resolve(__dirname, './dl')); // dl folder
			fs.mkdirSync(fullPath); // Songs
			fs.mkdirSync(fullPath + '/_vid'); // Audio-only video
		}
	}

	addCommand('m init', initFolders);

	addCommand('join', () => {
		boundTextChannel = msg.channel;
		if (!sender.getVoiceChannel()) return sendMessage('You\'re not in a voice channel.');
		sender.getVoiceChannel().join().then(() => {
			boundVoiceChannel = sender.getVoiceChannel();
			sendMessage('Bound text channel `' + boundTextChannel.name + '` with voice channel `' + boundVoiceChannel.name + '`.');
			initFolders();
		});
	});

	addCommand('leave', () => {
		stop();
		const clientVc = client.User.getVoiceChannel(msg.guild);
		if (!clientVc) return sendMessage('Not in a voice channel.');
		else clientVc.leave();
		boundTextChannel = null;
		boundVoiceChannel = null;
	});

	/**
	 * Takes a search term and calls `addToQueue` to process the chosen result
	 * 
	 * @param {string} a Search term
	 */
	function search (a) {
		const linkBase = 'https://www.youtube.com/watch?v=';
		yt.search(a, 3, (err, res) => {
			if (err) return console.log(err);
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
					if (e.message.channel.id !== msg.channel.id) return;
					else if (pickQuery === 'c') canceled = true;
					else if (pickQuery > 0 && pickQuery < 4) pick = parseInt(pickQuery);

					if (pick || canceled) {
						client.Dispatcher.removeListener(Events.MESSAGE_CREATE, trackListener);
						client.Dispatcher.emit(Events.MESSAGE_CREATE);
						if (!canceled) addToQueue(links[pick - 1]);
					}
				}
				// Needs to listen more than once until it gets the right msg
				client.Dispatcher.on(Events.MESSAGE_CREATE, trackListener);
				if (pick || canceled) client.Dispatcher.emit(Events.MESSAGE_CREATE); // No need for a 2nd time
			});
		});
	}

	function searchOnly (a) {
		const linkBase = 'https://www.youtube.com/watch?v=';
		yt.search(a, 3, (err, res) => {
			if (err) return console.log(err);
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
					if (e.message.channel.id !== msg.channel.id) return;
					else if (pickQuery === 'c') canceled = true;
					else if (pickQuery > 0 && pickQuery < 4) pick = parseInt(pickQuery);

					if (pick || canceled) {
						client.Dispatcher.removeListener(Events.MESSAGE_CREATE, trackListener);
						client.Dispatcher.emit(Events.MESSAGE_CREATE);
						if (!canceled) {
							const cRes = res.items[pick - 1];
							sendMessage('', {
								fields: [ {
									name: 'Uploader',
									value: `[${cRes.snippet.channelTitle}](${'https://www.youtube.com/channel/' + cRes.snippet.channelId})`
								}, {
									name: 'Video',
									value: `[${cRes.snippet.title}](${links[pick - 1]})`
								}, {
									name: 'Description',
									value: cRes.snippet.description
								} ],
								image: {
									url: cRes.snippet.thumbnails.high.url
								}
							});
						}
					}
				}
				client.Dispatcher.on(Events.MESSAGE_CREATE, trackListener);
				if (pick || canceled) client.Dispatcher.emit(Events.MESSAGE_CREATE);
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
		if (!client.User.getVoiceChannel(msg.guild)) return sendMessage('Not in a voice channel.');

		const validLink = /https?\:\/\/(?:www\.|m\.)?youtube\.com\/watch\?v=/;

		if (!validLink.test(a)) return search(a);
		else if (a.startsWith('http:')) return sendMessage('Make sure it\'s HTTPS');
		else {
			// Pre-download
			const vidId = a.slice(a.match(validLink)[0].length);
			busy = true;

			// Download stream
			const downloadStream = ytdl(a, { filter: 'audioonly' });
			downloadStream.on('info', i => {
				sendMessage('Queuing: `' + i.title + '`. Don\'t play yet until ready.');
				if (i['length_seconds'] >= 15 * 60) sendMessage('The video seems to be 15 minutes or more. This might take a while.');
				guildQueue.push(i.title.replace(/[\\\/:*?"<>|]/g, '')); // File name safe
			});

			// Save to file
			const guildFolder = './dl/' + msg.guild.id;
			const vidOut = path.resolve(__dirname, `${guildFolder}/_vid/${guildQueue.length + 1} - ${vidId}.mp4`);
			downloadStream.pipe(fs.createWriteStream(vidOut)).on('finish', () => {
				const mp3Out = path.resolve(__dirname, `${guildFolder}/${guildQueue[guildQueue.length - 1]}.mp3`);
				downloadStream.destroy(); // Destroy download stream
				fluentffmpeg()
					.input(vidOut)
					.audioCodec('libmp3lame')
					.audioFilters('volume=0.3') // 1.0 is pretty loud
					.save(mp3Out)
					.on('end', () => {
						busy = false;
						fs.unlink(vidOut); // Delete mp4 file, no need to wait
						return sendMessage('`' + guildQueue[guildQueue.length - 1] + '` is ready to be played.');
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
		if (!trackNumber) return sendMessage('Not a valid track number.');
		else if (trackNumber > guildQueue.length) return sendMessage(`There are only ${guildQueue.length} songs in the queue.`);
		else {
			const deletedTrack = guildQueue.splice(trackNumber - 1, 1);
			fs.unlinkSync(path.resolve(__dirname, `./dl/${msg.guild.id}/${deletedTrack}.mp3`));
		} // TODO: Also delete
	}

	['m r', 'music remove', 'remove'].forEach(s => addCommandSentence(s, removeTrack));

	function playMusic () {
		const voiceChannel = client.User.getVoiceChannel(msg.guild);
		if (!client.User.getVoiceChannel(msg.guild)) return sendMessage('Not in a voice channel.');
		else play(voiceChannel.getVoiceConnectionInfo());
	}

	['m p', 'music play', 'play'].forEach(s => addCommand(s, playMusic));

	function skip () {
		const encoder = client.VoiceConnections.find(vc => vc.voiceConnection.guild === msg.guild).voiceConnection.getEncoder();
		if (encoder.disposed) return;
		encoder.kill();
		ffmpeg.kill();
		ffmpeg = null;
		nextSong();
	}

	['m s', 'skip'].forEach(s => addCommand(s, skip));

	function toggleRepeatOne () {
		if (repeatOne) return sendMessage('Already on.');
		else {
			return sendMessage('Okie').then(() => {
				repeatAll = false;
				repeatOne = true;
			});
		}
	}

	['m re one', 'repeat one'].forEach(s => addCommand(s, toggleRepeatOne));

	function toggleRepeatAll () {
		if (repeatAll) return sendMessage('Already on.');
		else {
			return sendMessage('Okie').then(() => {
				repeatAll = true;
				repeatOne = false;
			});
		}
	}

	['m re all', 'repeat all'].forEach(s => addCommand(s, toggleRepeatAll));

	function repeatOff () {
		if (!(repeatOne || repeatAll)) return sendMessage('Not on repeat.');
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

	// TODO: test
	addCommand('clear', () => {
		guildQueue.forEach(songName => {
			fs.unlinkSync(path.resolve(__dirname, `./dl/${msg.guild.id}/${songName}.mp3`));
			//guildQueue.shift();
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

	function play (voiceConnectionInfo) {
		stopPlaying = false;
		if (busy && !stopPlaying && guildQueue.length <= 1) return sendMessage('Still processing your request(s)...');

		const sampleRate = 48000;
		const channels = 2;
		const bitDepth = 16;

		const songName = guildQueue[0];
		sendMessage('Now playing: `' + songName + '`');

		if (ffmpeg) ffmpeg.kill();
		ffmpeg = childProcess.spawn('ffmpeg', [
			'-re',
			'-i', path.resolve(__dirname, `./dl/${msg.guild.id}/${songName}.mp3`),
			'-f', 's16le',
			'-ar', sampleRate,
			'-ac', channels,
			'-'
		], {stdio: ['pipe', 'pipe', 'ignore']});

		const _ffmpeg = ffmpeg;
		const ff = ffmpeg.stdout;

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

		ff.once('readable', () => {
			if (!client.VoiceConnections.length) return console.log('Voice not connected');
			if (!voiceConnectionInfo) voiceConnectionInfo = client.VoiceConnections[0];
			const voiceConnection = voiceConnectionInfo.voiceConnection;

			const encoder = voiceConnection.getEncoder(options);

			const needBuffer = () => encoder.onNeedBuffer();
			encoder.onNeedBuffer = () => {
				const chunk = ff.read(readSize);

				if (_ffmpeg.killed) return;
				if (stopPlaying) return stop();

				if (!chunk) return setTimeout(needBuffer, options.frameDuration);

				const sampleCount = readSize / channels / (bitDepth / 8);
				encoder.enqueue(chunk, sampleCount);
			};

			needBuffer();
		});

		ff.once('end', nextSong);
	}

	function nextSong () {
		if (stopPlaying) return;
		if (!(repeatOne || repeatAll)) { // If neither are on...
			const firstSongName = guildQueue.shift(); // ..remove from internal queue
			fs.unlinkSync(path.resolve(__dirname, `./dl/${msg.guild.id}/${firstSongName}.mp3`)); // ...then delete the file
		} else if (repeatAll) guildQueue.push(guildQueue.shift()); // ...or else push the finished song to the back
		if (!queue[msg.guild.id].length) stop(); // TODO: Start timer for inactivity
		else setTimeout(play, 100, client.User.getVoiceChannel(msg.guild).getVoiceConnectionInfo()); // Play the next track
	}

	function stop () {
		stopPlaying = true;
		if (!ffmpeg) return;
		ffmpeg.kill();
		ffmpeg = null;
	}
}

exports.respond = respond;
