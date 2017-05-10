const express = require('express');
const app = express();

app.set('port', process.env.PORT || 5000);
app.use(express.static('public'));

app.get('/', (request, response) => {
	response.send('Hello World!');
});

app.listen(app.get('port'), () => {
	console.log('Bot with dummy web server is running at localhost:' + app.get('port')); // eslint-disable-line no-console
});
