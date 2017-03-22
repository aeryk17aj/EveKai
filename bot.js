//Ugh
const express = require('express');
const app = express();

// Dependencies
const Discordie = require('discordie');
const readline = require('readline');

// Plugins
const consoleHandler = require('./plugins/consoleHandler');
const messageHandler = require('./plugins/messageHandler');
const logger = require('./plugins/logger');
const osu = require('./plugins/osu');
const cleverbot = require('./plugins/cleverbot');
const music = require('./plugins/music');
// const drawing = require('./plugins/drawing');

// External JSON files
const auth = require('./auth');
const config = require('./config');

const Events = Discordie.Events;
const client = new Discordie({
	autoReconnect: true
});
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

rl.on('line', c => {
	consoleHandler.respond(c, client);
});

client.connect({ token: auth.loginToken });

client.Dispatcher.on(Events.GATEWAY_READY, e => { // eslint-disable-line no-unused-vars
	client.User.setGame('with new discoveries');
	client.User.setStatus(config.idleMode ? 'idle' : 'online');
	console.log('[System] Connected.');
});

client.Dispatcher.on(Events.DISCONNECTED, e => console.log(`[System] Connection interrupted. (${e.error})`));
client.Dispatcher.on(Events.GATEWAY_RESUMED, () => console.log('[System] Connection resumed.'));

client.Dispatcher.on(Events.GUILD_MEMBER_ADD, e => {
	e.guild.generalChannel.sendMessage(`Welcome, **${e.member.name}** to **${e.guild.name}**.`);
});

client.Dispatcher.on(Events.GUILD_MEMBER_REMOVE, e => {
	e.guild.generalChannel.sendMessage(`**${e.user.username}** has left **${e.guild.name}**.`);
});

/**
 * Fired every time a message is received by the bot.
 * @param {Object} e Event object
 */
function onMessageCreate (e) {
	if (!e) return;
	const msg = e.message;
	// TODO: Add idle mode, top priority listen
	logger.init(msg);
	messageHandler.respond(msg, client);
	if (!msg || !msg.content) return;
	osu.respond(msg);
	cleverbot.init(msg, client);
	music.respond(msg, client);
	// drawing.respond(msg, client);
}

client.Dispatcher.on(Events.MESSAGE_CREATE, onMessageCreate);

app.set('port', process.env.PORT || 5000);
app.use(express.static('public'));

app.get('/', (request, response) => {
	response.send('Hello World!');
});

app.listen(app.get('port'), () => {
	console.log("Bot with dummy web server is running at localhost:" + app.get('port'));
});
