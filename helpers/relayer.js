const getRequest = require('./getRequest')
const RELAYER_HOST = process.env.RELAYER_HOST

async function getWalletPrivileges (identityAddr = '', walletAddr) {
	const url = `${RELAYER_HOST}/identity/by-owner/${walletAddr}`
	const identityRes = (await getRequest(url)) || {}

	return Object.entries(identityRes)
		.some(([k, v]) => k.toLowerCase() === identityAddr.toLowerCase() && v)
}

async function isIdentityLimited (identityAddr) {
	const url = `${RELAYER_HOST}/identity/${identityAddr}`
	const identityRes = (await getRequest(url)) || {}
	return identityRes.isLimitedVolume
}

module.exports = {
	getWalletPrivileges,
	isIdentityLimited
}
