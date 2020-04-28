const fetch = require('node-fetch')
const getRequest = require('./getRequest')
const RELAYER_HOST = process.env.RELAYER_HOST

async function getWalletPrivileges(identityAddr = '', walletAddr) {
	const url = `${RELAYER_HOST}/identity/by-owner/${walletAddr}`
	const identityRes = (await getRequest(url)) || {}

	return Object.entries(identityRes).some(
		([k, v]) => k.toLowerCase() === identityAddr.toLowerCase() && v
	)
}

async function isIdentityLimited(identityAddr) {
	const res = await fetch(`${RELAYER_HOST}/identity/${identityAddr}`)
	if (res.status === 404) return false
	if (res.status !== 200)
		throw new Error(`isIdentityLimited unexpected status code ${res.status}`)
	const identityInfo = await res.json()
	return identityInfo.isLimitedVolume
}

module.exports = {
	getWalletPrivileges,
	isIdentityLimited,
}
