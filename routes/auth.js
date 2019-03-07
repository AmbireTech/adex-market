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
	const privileges = identityContract.privileges.call()
	return privileges
}

function authUser (req, res, next) {
	const { identity, mode, signature, authToken, hash } = req.body

	return getAddrFromSignedMsg({ mode, signature, hash, msg: authToken })
		.then((recoveredAddr) => {
			recoveredAddr = recoveredAddr.toLowerCase()
			console.log('recoveredAddr', recoveredAddr)
			return callToContract()
				.then((res) => {
					let expiryTime = Date.now() + cfg.expiryTime

					// TODO change if needed when it is known how the result will look like
					if (res.privileges > 0) {
						redisClient.set('session:' + signature, JSON.stringify({ 'user': recoveredAddr, 'authToken': authToken, 'mode': mode }), (err, res) => {
							if (err != null) {
								console.log('Error saving session data for user ' + recoveredAddr + ' :' + err)
							} else {
								redisClient.expire('session:' + signature, expiryTime, () => { })
								return res.send({
									status: 'OK',
									identity: identity,
									signature: signature,
									expiryTime: expiryTime
								})
							}
						})
					}
				})
		})
		.catch((err) => {
			console.log('Error getting addr from signed msg', err)
			return err
		})
}

module.exports = router
