const express = require('express')
const redisClient = require('../redisInit')
const { getAddrFromSignedMsg } = require('../helpers/web3/utils')
const cfg = require('../cfg')
const { web3 } = require('../helpers/web3/ADX')
const identityAbi = require('../helpers/web3/abi/Identity')

const router = express.Router()

router.post('/', authUser)

function callToContract (identityAddress, recoveredAddr) {
	const identityInstance = web3.eth.Contract(identityAbi, identityAddress)
	return identityInstance.methods.privileges(recoveredAddr).call({ from: recoveredAddr }, (err, res) => {
		if (err) {
			return Promise.reject(err)
		}
		return Promise.resolve(res)
	})
}

function authUser (req, res, next) {
	const { identity, mode, signature, authToken, hash, typedData } = req.body
	return getAddrFromSignedMsg({ mode: mode, signature: signature, hash: hash, typedData: typedData, msg: authToken })
		.then((recoveredAddr) => {
			recoveredAddr = recoveredAddr.toLowerCase()
			return callToContract(identity, recoveredAddr)
				.then((privileges) => {
					console.log('we here now', privileges)
					let sessionExpiryTime = Date.now() + cfg.sessionExpiryTime

					// TODO change if needed when it is known how the result will look like
					if (privileges > 0) {
						redisClient.set('session:' + signature, JSON.stringify({ 'address': recoveredAddr, 'authToken': authToken, 'mode': mode, 'identity': identity, 'privileges': privileges }), (err, result) => {
							if (err != null) {
								console.log('Error saving session data for user ' + recoveredAddr + ' :' + err)
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
					}
				})
				.catch((err) => {
					console.error('error making call to the contract', err)
				})
		})
		.catch((err) => {
			console.error('Error getting addr from signed msg', err)
			return res.status(400).send({ error: 'An error occured while authenticating' })
		})
}

module.exports = router
