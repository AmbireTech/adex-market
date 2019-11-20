const fetch = require('node-fetch')

function getRequest (uri) {
	return fetch(uri)
		.then(res => {
			if (res.status >= 200 && res.status < 400) {
				return res.json()
			}

			return res.text().then(text => {
				throw new Error(`Fetch error at "${res.url}", status: [${res.status}] ${res.statusText}, err: ${text} `)
			})
		})
		.catch((err) => {
			console.error('=== ERROR IN GET REQUEST ===')
			console.error(err)
			throw new Error(err)
		})
}

module.exports = getRequest
