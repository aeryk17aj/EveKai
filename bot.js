// Dependencies
const Discordie = require('discordie');
const readline = require('readline');

// Handlers
const consoleHandler = require('./handler/consoleHandler');
const messageHandler = require('./handler/messageHandler');

const config = require('./config');

const Events = Discordie.Events;
const client = new Discordie({
	autoReconnect: true
});
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

rl.on('line', c =>
	consoleHandler.respond(c, client));

client.connect({ token: process.env.BOT_TOKEN || require('./auth').loginToken });

client.Dispatcher.on(Events.GATEWAY_READY, e => { // eslint-disable-line no-unused-vars
	client.User.setGame('with new discoveries');
	client.User.setStatus(config.idleMode ? 'idle' : 'online');
	console.log('[System] Connected.');
});

client.Dispatcher.on(Events.DISCONNECTED, e =>
	console.log(`[${getCurrentTime()}] [System] Connection interrupted. (${e.error})`));

client.Dispatcher.on(Events.GATEWAY_RESUMED, () =>
	console.log(`[${getCurrentTime()}] [System] Connection resumed.`));

client.Dispatcher.on(Events.GUILD_MEMBER_ADD, e =>
	e.guild.generalChannel.sendMessage(`Welcome, **${e.member.name}** to **${e.guild.name}**.`));

client.Dispatcher.on(Events.GUILD_MEMBER_REMOVE, e =>
	e.guild.generalChannel.sendMessage(`**${e.user.username}** has left **${e.guild.name}**.`));

client.Dispatcher.on(Events.MESSAGE_CREATE, e =>
	messageHandler.handle(e, client));

function getCurrentTime () {
	return new Date(Date.now()).toLocaleString('en-US');
}