const getRequest = require('./getRequest')
const RELAYER_HOST = process.env.RELAYER_HOST

async function getIdentity (address) {
	const identity = await getRequest(`${RELAYER_HOST}/identity/${address}`)
	return identity
}

async function getWalletPrivileges (identityAddr, walletAddr, allowPending) {
	const identityRes = await getIdentity(identityAddr)
	if (identityRes && identityRes.privileges.length) {
		const privileges = identityRes
			.privileges
			.filter(p => p.address &&
				(p.address.toLowerCase() === walletAddr.toLowerCase()) &&
				(p.status === 'success' || (allowPending && (p.status === 'pending')))
			)[0] || {}

		return privileges.level || 0
	}
}

module.exports = {
	getIdentity,
	getWalletPrivileges
}
