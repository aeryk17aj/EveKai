const Canvas = require('canvas');
const get = require('simple-get');

const fs = require('fs');
const path = require('path');

const botUtil = require('../util/botUtil');
const CommandHandler = require('../util/msgUtil');

const config = require('../config');

/**
 * Primary message listener
 * @param  {IMessage} msg Message object to be used
 * @param  {Discordie} client Bot client object
 */
function respond (msg, client) {
	const msgText = msg.content;
	const sender = msg.member || msg.author; // IUser as a substitute for DMs
	const senderPfp = sender.staticAvatarURL;
	const msgChannel = msg.channel;
	const msgGuild = msg.guild;

	const botUser = msg.isPrivate ? client.User : client.User.memberOf(msgGuild);

	const sendMessage = (s, e) => msgChannel.sendMessage(s, false, e);
	const uploadFile = (s, n) => msgChannel.uploadFile(s, n || "drawing.jpg");

	const command = msgText.slice(config.prefix.length);
	const handler = new CommandHandler(command);

	if (!msgText.startsWith(config.prefix)) return;

	const addCommand = (c, f) => handler.addCommand(c, f);
	const addDrawCommandSync = (c, f, w, h) => addCommand(c, () => {
		const canvas = new Canvas(w || 640, h || 480);
		const ctx = canvas.getContext('2d');
		f(ctx, canvas, w, h);
		const imgBuffer = canvas.toBuffer();
		uploadFile(imgBuffer);
	});
	const addCommandSentence = (c, f) => handler.addCommandSentence(c, f);
	const addCommandArgs = (c, f) => handler.addCommandArgs(c, f);

	const senderIsOwner = botUtil.senderIsOwner(msg);

	addCommandSentence('evalC', a => {
		if (!senderIsOwner || a === 'e.message.content' || a === 'msgText') return;
		let result;
		return new Promise(resolve => {
			result = eval(a);
			resolve('Success');
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

	function getPfp () {
		get({ url: senderPfp, headers: { 'Content-Type': 'image/jpeg'} }, (err, stream) => {
			stream.pipe(fs.createWriteStream(imgOut));
		});
	}

	addCommand('pfp', () => {
		if (!hasAvatar) getPfp();
		get(senderPfp, (err, img) => {
			if (err) return console.log(err);
			uploadFile(img, 'aaa.jpg');
		});
	});
}

exports.respond = respond;
