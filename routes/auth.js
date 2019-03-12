const express = require('express')
const redisClient = require('../redisInit')
const { getAddrFromSignedMsg } = require('../helpers/web3/utils')
const cfg = require('../cfg')
const { web3 } = require('../helpers/web3/ADX')
const identityAbi = require('../helpers/web3/abi/Identity')

const router = express.Router()

router.post('/', authUser)

function callToContract (identity) {
	const identityContract = web3.eth.Contract(identityAbi, identity)
	return identityContract.methods.privileges.call()
}

function authUser (req, res, next) {
	const { identity, mode, signature, authToken, hash, typedData } = req.body
	return getAddrFromSignedMsg({ mode: mode, signature: signature, hash: hash, typedData: typedData, msg: authToken })
		.then((recoveredAddr) => {
			recoveredAddr = recoveredAddr.toLowerCase()
			return callToContract(identity)
				.then((res) => {
					let sessionExpiryTime = Date.now() + cfg.sessionExpiryTime

					// TODO change if needed when it is known how the result will look like
					if (res.privileges > 0) {
						redisClient.set('session:' + signature, JSON.stringify({ 'user': recoveredAddr, 'authToken': authToken, 'mode': mode }), (err, res) => {
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
			console.log('Error getting addr from signed msg', err)
			return err
		})
}

module.exports = router
