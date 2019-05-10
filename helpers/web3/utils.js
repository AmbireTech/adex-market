const fetch = require('node-fetch')

async function getAddrFromSignedMsg (args) {
	const response = await fetch(`${process.env.RELAYER_HOST}/auth/addr`,
		{
			method: 'POST',
			headers: {
				'Content-type': 'application/json'
			},
			body: JSON.stringify(args)
		})
		.then(res => res.json())
	return response
}

module.exports = {
	getAddrFromSignedMsg: getAddrFromSignedMsg
}
