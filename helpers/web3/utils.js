const fetch = require('node-fetch')

async function getAddrFromSignedMsg (args) {
	const response = await fetch(`${process.env.RELAYER_HOST}/auth/addr`,
		{
			method: 'POST',
			body: args
		})

	return response
}

module.exports = {
	getAddrFromSignedMsg: getAddrFromSignedMsg
}
