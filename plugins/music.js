const fluentffmpeg = require('fluent-ffmpeg');
const ytdl = require('ytdl-core');
const YouTube = require('youtube-node');
const Events = require('discordie').Events;

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const CommandHandler = require('../util/msgUtil');

const auth = require('../auth');
const config = require('../config');
const userIds = require('../userIds');

const yt = new YouTube();
yt.setKey(auth.yt);

// Internal queue, stores position and id
const queue = {};
let guildQueue;
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

	// Initialize queue
	if (!queue[msg.guild.id]) queue[msg.guild.id] = [];
	guildQueue = queue[msg.guild.id];

	// Check for some leftovers if on an empty queue
	if (!guildQueue.length) guildQueue = fs.readdirSync(path.resolve(__dirname, './dl/' + msg.guild.id + '/'))
		.filter(f => f.slice(-4) === '.mp3')
		.map(f => f.slice(0, f.lastIndexOf('.'))); // Doesn't need the extension

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

	addCommand('join', () => {
		boundTextChannel = msg.channel;
		if (!sender.getVoiceChannel()) return sendMessage('You\'re not in a voice channel.');
		sender.getVoiceChannel().join().then(() => {
			boundVoiceChannel = sender.getVoiceChannel();
			sendMessage('Bound text channel `' + boundTextChannel.name + '` with voice channel `' + boundVoiceChannel.name + '`.');

			// Initialize queue
			if (!queue[msg.guild.id]) queue[msg.guild.id] = [];

			// Initialize folders
			const guildFolder = './dl/' + msg.guild.id;
			const fullPath = path.resolve(__dirname, guildFolder);
			if (!fs.existsSync(fullPath)) {
				fs.mkdirSync(fullPath); // Songs
				fs.mkdirSync(fullPath + '/_vid'); // Audio-only video
			}
		});
	});

	addCommand('leave', () => {
		stop();
		client.User.getVoiceChannel(msg.guild).leave();
		boundTextChannel = null;
		boundVoiceChannel = null;
	});

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
				// TODO: Util: waitFor
				function trackListener (e) {
					// console.log('Emitted to secondary');
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
				client.Dispatcher.on(Events.MESSAGE_CREATE, trackListener);
				if (pick || canceled) client.Dispatcher.emit(Events.MESSAGE_CREATE); // I don't need a 2nd time
			});
		});
	}

	['m f', 'search'].forEach(s => addCommandSentence(s, search));

	function addToQueue (a) {
		// Channel check
		if (!client.User.getVoiceChannel(msg.guild)) return sendMessage('Not in a voice channel.');

		const VIDEO_BASE = 'https://www.youtube.com/watch?v=';
		const vidId = a.slice(VIDEO_BASE.length);
		const guildQueue = queue[msg.guild.id];

		if (!a.startsWith(VIDEO_BASE)) search(a); // return sendMessage('Not a valid link.');
		else if (a.startsWith('http:')) return sendMessage('Make sure it\'s HTTPS');
		else {
			// Download stream
			const stream = ytdl(a, { filter: 'audioonly' });
			stream
				.on('info', i => {
					sendMessage('Queuing: `' + i.title + '` Don\'t play yet until ready.');
					if (!guildQueue) queue[msg.guild.id] = [];
					guildQueue.push(i.title);
				});

			// Save to file
			const guildFolder = './dl/' + msg.guild.id;
			const vidOut = path.resolve(__dirname, `${guildFolder}/_vid/${guildQueue.length + 1} - ${vidId}.mp4`);
			stream.pipe(fs.createWriteStream(vidOut))
				.on('finish', () => {
					const mp3Out = path.resolve(__dirname, `${guildFolder}/${guildQueue[guildQueue.length - 1]}.mp3`);
					stream.destroy(); // Destroy download stream
					fluentffmpeg()
						.input(vidOut)
						.audioCodec('libmp3lame')
						.audioFilters('volume=0.5') // 1.0 is pretty loud
						.save(mp3Out)
						// .on('progress', progress => {
						// 	process.stdout.cursorTo(0);
						// 	process.stdout.clearLine(1);
						// 	process.stdout.write(progress.timemark);
						// })
						.on('end', () => {
							process.stdout.clearLine(1);
							process.stdout.write('\n');
							fs.unlink(vidOut); // Delete mp4 file
							return sendMessage('`' + guildQueue[guildQueue.length - 1] + '` is ready to be played.');
						});
				});
		}
	}

	['m q', 'music queue', 'add'].forEach(s => addCommandSentence(s, addToQueue));

	function removeTrack (a) {
		const trackNumber = a; // Number(a);
		if (!trackNumber) return sendMessage('Not a valid track number.');
		else if (trackNumber > queue[msg.guild.id].length) return sendMessage(`There are only ${queue[msg.guild.id].length} songs in the ueue.`);
		else queue[msg.guild.id].splice(trackNumber - 1, 1);
	}

	['m r', 'music remove', 'remove'].forEach(s => addCommandSentence(s, removeTrack));

	function playMusic () {
		const voiceChannel = client.User.getVoiceChannel(msg.guild);
		if (!client.User.getVoiceChannel(msg.guild)) return sendMessage('Not in a voice channel.');
		else play(voiceChannel.getVoiceConnectionInfo());
	}

	['m p', 'music play', 'play'].forEach(s => addCommand(s, playMusic));

	addCommand('skip', () => {
		const songName = queue[msg.guild.id].shift();
		fs.unlinkSync(path.resolve(__dirname, `./dl/${msg.guild.id}/${songName}.mp3`));
		sendMessage('Skipped `' + songName + '`.').then(() => {
			play(client.User.getVoiceChannel(msg.guild).getVoiceConnectionInfo());
		});
	});

	addCommand('stop', stop);

	addCommand('clear', () => {
		queue[msg.guild.id].forEach(songName => {
			fs.unlinkSync(path.resolve(__dirname, `./dl/${msg.guild.id}/${songName}.mp3`));
			queue[msg.guild].shift();
		});
	});

	addCommand('list', () => {
		const songList = queue[msg.guild.id] || [];
		sendMessage('```ini\n[Song List]\n\n' + (songList.map((s, i) => '\t ' + (i + 1) + ' : ' + s).join('\n') || '\tNothing but just us...') + '```');
	});

	function play (voiceConnectionInfo) {
		stopPlaying = false;

		const sampleRate = 48000;
		const channels = 2;
		const bitDepth = 16;

		const songName = queue[msg.guild.id][0];
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

		ff.once('end', () => {
			if (stopPlaying) return;
			queue[msg.guild.id].shift(); // Remove from internal queue
			fs.unlink(path.resolve(__dirname, `./dl/${msg.guild.id}/${songName}.mp3`)); // Remove file
			if (!queue[msg.guild.id].length) stop(); // TODO: Start timer for inactivity
			else setTimeout(play, 100, voiceConnectionInfo); // Play the next track
		});
	}

	function stop () {
		stopPlaying = true;
		if (!ffmpeg) return;
		ffmpeg.kill();
		ffmpeg = null;
	}
}

exports.respond = respond;
