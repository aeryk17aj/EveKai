// Credits to feross (github)
// Source https://github.com/feross/simple-concat/blob/730653a6851acff7718c6c4bd49c16bf4f707c04/index.js

// Changes: Formatted spacing and added semicolons

module.exports = function (stream, cb) {
	const chunks = [];
	stream.on('data', function (chunk) {
		chunks.push(chunk);
	});
	stream.once('end', function () {
		if (cb) cb(null, Buffer.concat(chunks));
		cb = null;
	});
	stream.once('error', function (err) {
		if (cb) cb(err);
		cb = null;
	});
};