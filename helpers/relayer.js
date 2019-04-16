const getRequest = require('./getRequest')
const RELAYER_HOST = process.env.RELAYER_HOST

async function getWalletPrivileges (identityAddr, walletAddr) {
	const url = `${RELAYER_HOST}/identity/privileges?identityAddr=${identityAddr}&owner=${walletAddr}`
	const identityRes = await getRequest(url)
	if (identityRes && identityRes.meta.identityPrivileges.length) {
		return 1
	} else {
		return 0
	}
}

module.exports = {
	getWalletPrivileges
}
