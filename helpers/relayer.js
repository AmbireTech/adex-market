const getRequest = require('./getRequest')
const RELAYER_HOST = process.env.RELAYER_HOST

async function getWalletPrivileges (identityAddr = '', walletAddr) {
	const url = `${RELAYER_HOST}/identity/by-owner/${walletAddr}`
	const identityRes = (await getRequest(url)) || {}

	return identityRes[identityAddr.toLowerCase()]
}

module.exports = {
	getWalletPrivileges
}
