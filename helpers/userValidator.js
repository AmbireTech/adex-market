const signModes = [0, 1, 2]
const roles = ['publisher', 'advertiser']

function isIdentityOk (identity) {
	if (typeof identity !== 'string' || identity.length !== 42 || identity.startsWith('0x')) {
		return false
	}
	return true
}

function isAddressOk (address) {
	if (typeof address !== 'string' || address.length !== 42 || address.startsWith('0x')) {
		return false
	}
	return true
}

function isSignatureOk (signature) {
	if (typeof signature !== 'string' || signature.length !== 132 || signature.startsWith('0x')) {
		return false
	}
	return true
}

function isAuthTokenOk (authToken) {
	if (isNaN(authToken) || authToken.length !== 16) {
		return false
	}
	return true
}

function isModeOk (mode) {
	return signModes.includes(mode)
}

function isHashOk (hash) {
	if (typeof hash !== 'string' || hash.length !== 64 || hash.startsWith('0x')) {
		return false
	}
	return true
}

function isTypedDataOk (typedData) {
	if (!Array.isArray(typedData)) {
		return false
	}
	return true
}

function isRoleOk (role) {
	return roles.incudes(role)
}

function isChannelOk (channel) {
	return true // TODO
}

function isWithdrawnOk (withdrawn) {
	return true // TODO
}

function validateUser (req, res, next) {
	const user = req.body

	if (!user) {
		return false
	}
	const validity = [
		isIdentityOk(user.identity),
		isAddressOk(user.address),
		isSignatureOk(user.signature),
		isAuthTokenOk(user.authToken),
		isModeOk(user.mode),
		isHashOk(user.hash),
		// optional properties
		user.hasOwnProperty('typedData') ? isTypedDataOk(user.typedData) : true,
		user.hasOwnProperty('roles') ? isRoleOk(user.roles) : true,
		user.hasOwnProperty('channel') ? isChannelOk(user.channel) : true,
		user.hasOwnProperty('withdrawn') ? isWithdrawnOk(user.withdrawn) : true
	]

	if (validity.every(val => val)) {
		return next()
	}
	return res.status(403).send({ error: 'invalid user data' })
}

module.exports = validateUser
