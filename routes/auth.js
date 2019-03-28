const express = require('express')
const redisClient = require('../redisInit')
const { getAddrFromSignedMsg } = require('../helpers/web3/utils')
const cfg = require('../cfg')
const { provider, ethers } = require('../helpers/web3/ethers')
const identityAbi = require('../helpers/web3/abi/Identity')

const router = express.Router()

router.post('/', authUser)

async function checkIdentityPrivileges (identity, walletAddress) {
	const contract = new ethers.Contract(identity, identityAbi, provider)
	let privileges = await contract.privileges(walletAddress)

	return privileges
}

async function authUser (req, res, next) {
	try {
		const { identity, mode, signature, authToken, hash, typedData, signerAddress, prefixed = true } = req.body
		const recoveredAddr = await getAddrFromSignedMsg({ mode, signature, hash, typedData, msg: authToken, prefixed })
		const walletAddress = recoveredAddr.toLowerCase()
		// console.log('recoveredAddr', recoveredAddr)

		if (walletAddress !== signerAddress.toLowerCase()) {
			return res.status(400).send('Invalid signature')
		}

		const privileges = (await checkIdentityPrivileges(identity, walletAddress)) || 0
		// console.log('privileges', privileges)

		const sessionExpiryTime = Date.now() + cfg.sessionExpiryTime
		if (privileges > 1) {
			redisClient.set('session:' + signature,
				JSON.stringify({
					'address': recoveredAddr,
					'authToken': authToken,
					'mode': mode,
					'identity': identity,
					'privileges': res.privileges
				}),
				(err, result) => {
					if (err != null) {
						console.log('Error saving session data for user ' + recoveredAddr + ' :' + err)
						return res.status(500).send('Db write error')
					} else {
						redisClient.expire('session:' + signature, sessionExpiryTime, () => { })
						return res.send({
							status: 'OK',
							identity: identity,
							signature: signature,
							expiryTime: sessionExpiryTime
						})
					}
				})
		} else {
			return res.status(400).send('Invalid privileges')
		}
	} catch (err) {
		console.error('Error getting addr from signed msg', err)
		// TODO: Handle error response
		return res.status(500).send('Server error')
	}
}

module.exports = router
