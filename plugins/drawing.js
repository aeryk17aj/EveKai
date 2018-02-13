const Canvas = require('canvas');
// const Image = Canvas.Image;
const request = require('request');

const fs = require('fs');
const path = require('path');
const util = require('util');
const readFile = util.promisify(fs.readFile);

const { log } = require('../util/botUtil');
const CommandHandler = require('../util/msgUtil');

const { prefix } = require('../config');

/**
 * Primary message listener
 * @param {IMessage} msg Message object to be used
 */
function respond (msg) {
	const { content: msgText, channel, member: sender } = msg;
	if (!msgText.startsWith(prefix)) return;
	const { staticAvatarURL: senderPfp } = sender;

	// const botUser = msg.isPrivate ? client.User : client.User.memberOf(msgGuild);

	// const sendMessage = (s, e) => msgChannel.sendMessage(s, false, e);
	const uploadFile = (s, n) => channel.uploadFile(s, n || 'drawing.jpg');

	const { addCommand } = new CommandHandler(msgText.slice(prefix.length));
	
	const addDrawCommandSync = (c, f, w, h) => addCommand(c, () => {
		const canvas = Canvas.createCanvas(w || 640, h || 480);
		const ctx = canvas.getContext('2d');
		f(ctx, canvas, w, h);
		canvas.toBuffer((err, buf) => {
			if (err) return log('Error converting image to buffer');
			uploadFile(buf);
		});
	});

	/* const addDrawCommand = (c, f, w, h) => addCommand(c, () => {
		const canvas = new Canvas(w || 640, h || 480);
		const ctx = canvas.getContext('2d');
		f(ctx, canvas, w, h).then(() => {
			const imgBuffer = canvas.toBuffer();
			uploadFile(imgBuffer);
		});
	});
	const addCommandSentence = (c, f) => handler.addCommandSentence(c, f);
	const addCommandArgs = (c, f) => handler.addCommandArgs(c, f); */

	addDrawCommandSync('testDraw', (ctx, canvas, w, h) => {
		ctx.fillStyle = '#FFB2C5';
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = 'white';
		ctx.font = '48px serif';
		ctx.fillText('Hello, ' + (sender.nick || sender.username), 10, 50);
	}, 300, 100);

	const guildFolder = './dl/' + msg.guild.id;
	const imgOutR = `${guildFolder}/img/${sender.id} - ${sender.avatar}.jpg`;
	const imgOut = path.resolve(__dirname, imgOutR);
	const hasAvatar = fs.readdirSync(path.resolve(__dirname, guildFolder + '/img')).includes(`${sender.id} - ${sender.avatar}.jpg`);

	async function getPfp () {
		return new Promise((resolve, reject) => {
			log('Checking again!');
			if (fs.existsSync(imgOut)) resolve();
			log('Starting fetch.');

			request(senderPfp)
				.pipe(fs.createWriteStream(imgOut))
				.on('close', () => {
					log('Finished fetch.');
					resolve();
				});
		});
	}

	/**
	 * @param {Error} err
	 * @param {NodeJS.ReadableStream} stream
	 * @param {function} cb
	 */
	function downloadPicture (err, stream, cb) {
		if (err) log(err);

		log('Fetching..');
		const write = stream.pipe(fs.createWriteStream(imgOut));
		
		write.on('close', cb);
	}

	addDrawCommandSync('drawMe', async (ctx, canvas, w, h) => {
		log('Checking for pfp');
		if (!hasAvatar) {
			log('pfp not found. Fetching...');
			await getPfp();
		}
		ctx.fillStyle = '#FFB2C5';
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = 'white';
		ctx.font = '16px serif';
		ctx.fillText(sender.nick || sender.username, 10, 17, 140);
		log(imgOut);
		if (!fs.existsSync(imgOutR)) log('Picture doesn\'t exist, wtf?!');
		log('Getting Image');
		const file = await readFile(imgOut);
		const pfp = await Canvas.loadImage(file);
		ctx.drawImage(pfp, 21, 51, 128, 128); // FIXME:
	}, 170, 200);

	addCommand('dlpfp', () => {
		if (!hasAvatar) getPfp();
	});

}

exports.respond = respond;
