const getRequest = require('./getRequest')
const RELAYER_HOST = process.env.RELAYER_HOST

async function getWalletPrivileges (identityAddr, walletAddr) {
	const url = `${RELAYER_HOST}/identity/privileges?identityAddr=${identityAddr}&owner=${walletAddr}`
	console.log(url)
	const identityRes = await getRequest(url)
	console.log('IDENTITY IS', identityRes)
	if (!!identityRes && Array.isArray(identityRes.privileges) && identityRes.privileges.includes(walletAddr)) {
		return 1
	} else {
		return 0
	}
}

module.exports = {
	getWalletPrivileges
}
