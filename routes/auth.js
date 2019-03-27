const express = require('express')
const redisClient = require('../redisInit')
const { getAddrFromSignedMsg } = require('../helpers/web3/utils')
const cfg = require('../cfg')
const { web3 } = require('../helpers/web3/ADX')
const identityAbi = require('../helpers/web3/abi/Identity')

const router = express.Router()

router.post('/', authUser)

// TODO: use ethers ans async
function callToContract (identity, walletAddress) {
	const identityContract = web3.eth.Contract(identityAbi, identity)
	return identityContract.methods.privileges(walletAddress).call()
}

function authUser (req, res, next) {
	const { identity, mode, signature, authToken, hash, typedData, signerAddress } = req.body
	return getAddrFromSignedMsg({ mode: mode, signature: signature, hash: hash, typedData: typedData, msg: authToken })
		.then((recoveredAddr) => {
			const walletAddress = recoveredAddr.toLowerCase()
			if (walletAddress !== signerAddress.toLowerCase()) {
				return res.status(400).send('Invalid signature')
			}

			return callToContract(identity, walletAddress)
				.then((res) => {
					let sessionExpiryTime = Date.now() + cfg.sessionExpiryTime

					// TODO change if needed when it is known how the result will look like
					if (res.privileges > 1) {
						redisClient.set('session:' + signature, JSON.stringify({ 'address': recoveredAddr, 'authToken': authToken, 'mode': mode, 'identity': identity, 'privileges': res.privileges }), (err, res) => {
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
					} else {
						return res.status(400).send('Invalid privileges')
					}
				})
		})
		.catch((err) => {
			console.error('Error getting addr from signed msg', err)
			return res.status(500).send('Server error')
		})
}

module.exports = router
