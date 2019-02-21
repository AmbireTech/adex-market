const fetch = require('node-fetch')

function getRequest (uri) {
	return fetch(uri)
		.then(res => res.json())
}

module.exports = getRequest
