const Canvas = require('canvas');
// const Image = Canvas.Image;
const get = require('simple-get');

const fs = require('fs');
const path = require('path');
const util = require('util');
const readFile = util.promisify(fs.readFile);

const { log } = require('../util/botUtil');
const CommandHandler = require('../util/msgUtil');

const { prefix } = require('../config');

/**
 * Primary message listener
 * @param  {IMessage} msg Message object to be used
 */
function respond (msg) {
	const { content: msgText, channel: msgChannel } = msg;
	const sender = msg.member || msg.author; // IUser as a substitute for DMs
	const senderPfp = sender.staticAvatarURL;

	// const botUser = msg.isPrivate ? client.User : client.User.memberOf(msgGuild);

	// const sendMessage = (s, e) => msgChannel.sendMessage(s, false, e);
	const uploadFile = (s, n) => msgChannel.uploadFile(s, n || 'drawing.jpg');

	const command = msgText.slice(prefix.length);
	const handler = new CommandHandler(command);
	
	if (!msgText.startsWith(prefix)) return;
	
	const { addCommand } = handler;
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

	// TODO: Dynamic width :thinking:
	addDrawCommandSync('testDraw', (ctx, canvas, w, h) => {
		ctx.fillStyle = '#FFB2C5';
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = 'white';
		ctx.font = '48px serif';
		ctx.fillText('Hello, ' + (sender.nick || sender.username), 10, 50);
	}, 300, 100);

	const guildFolder = './dl/' + msg.guild.id;
	const imgOut = path.resolve(__dirname, `${guildFolder}/_img/${sender.id} - ${sender.avatar}.jpg`);
	const hasAvatar = fs.readdirSync(path.resolve(__dirname, guildFolder + '/_img')).includes(`${sender.id} - ${sender.avatar}.jpg`);

	async function getPfp () {
		if (fs.existsSync(imgOut)) return;
		get({ url: senderPfp, headers: { 'Content-Type': 'image/jpeg' } }, (err, stream) => downloadPicture(err, stream, () => Promise.resolve));
	}

	/**
	 * @param {Error} err
	 * @param {NodeJS.ReadableStream} stream
	 * @param {function} cb
	 */
	function downloadPicture (err, stream, cb) {
		if (err) log(err);
		const write = stream.pipe(fs.createWriteStream(imgOut));
		
		write.on('finish', cb);
	}

	addDrawCommandSync('drawMe', async (ctx, canvas, w, h) => {
		if (!hasAvatar) await getPfp();
		ctx.fillStyle = '#FFB2C5';
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = 'white';
		ctx.font = '16px serif';
		ctx.fillText(sender.nick || sender.username, 10, 17, 140);
		const pfp = Canvas.loadImage(await readFile(imgOut));
		ctx.drawImage(await pfp, 21, 51, 128, 128); // FIXME:
	}, 170, 200);

	addCommand('dlpfp', () => {
		if (!hasAvatar) getPfp();
	});

}

exports.respond = respond;
