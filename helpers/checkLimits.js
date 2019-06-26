const fetch = require('node-fetch')
const RELAYER_HOST = process.env.RELAYER_HOST

async function isAddrLimited (addr) {
	return fetch(`${RELAYER_HOST}/TODO`, { // TODO: Do this when ready
		method: 'POST',
		headers: {
			'Content-type': 'application/json'
		},
		body: JSON.stringify({ addr })
	})
		.then((res) => res.json())
		.then((res) => {
			return res.privilleges > 1
		})
}

module.exports = isAddrLimited
