class PruneUtil {
	constructor (client) {
		this.client = client;
	}

	fetchMoreMessages (channel, left) {
		const before = channel.messages[0];
		return channel.fetchMessages(Math.min(left, 100), before)
			.then(e => this.onFetch(e, channel, left));
	}
	
	onFetch (e, channel, left) {
		if (!e.messages.length) return Promise.resolve();
		left -= e.messages.length;
		if (left <= 0) return Promise.resolve();
		return this.fetchMoreMessages(channel, left);
	}
	
	fetchMoreSpecificMessages (channel, user, left) {
		const before = channel.messages.filter(m => m.author.id === user.id)[0];
		return channel.fetchMessages(100, before)
			.then(e => this.onFetchUser(e, channel, user, left));
	}
	
	onFetchUser (e, channel, user, left) {
		if (!e.messages.length) return Promise.resolve();
		left -= e.messages.filter(m => m.author.id === user.id).length;
		if (left <= 0) return Promise.resolve();
		return this.fetchMoreSpecificMessages(channel, user, left);
	}
	
	deleteMessages (msgs, channel, left) {
		if (!left) left = msgs.length;
		const removeCount = Math.min(100, left);
		return this.client.Messages.deleteMessages(msgs.slice(0, removeCount), channel)
			.then(() => this.onDeleteMore(msgs, channel, left - removeCount))
			// .catch(() => console.log('What, why can\'t it delete?'));
			.catch(() => channel.sendMessage(`
				Deleting past 100 is broken at the moment.\n
				Please prune by 100s while Aeryk gets this fixed.
			`));
	}
	
	onDeleteMore (msgs, channel, left) {
		// Messages are fetched when insufficient before deletion so...
		// If there's nothing to delete, it's done deleting
		if (!msgs.length || left <= 0) return Promise.resolve();
		return this.deleteMessages(msgs, channel, left);
	}
}

module.exports = PruneUtil;
