const express = require('express')
const redisClient = require('../redisInit')
const { getAddrFromSignedMsg } = require('../helpers/web3/utils')
const cfg = require('../cfg')
const { provider, ethers } = require('../helpers/web3/ethers')
const identityAbi = require('../helpers/web3/abi/Identity')
const { getWalletPrivileges } = require('../helpers/relayer')

const router = express.Router()

router.post('/', authUser)

async function checkWalletPrivileges (identity, walletAddr, allowPending) {
	try {
		const contract = new ethers.Contract(identity, identityAbi, provider)
		const privileges = await contract.privileges(walletAddr)
		return privileges
	} catch (err) {
		console.error('err', err)
		const privileges = await getWalletPrivileges(identity, walletAddr, allowPending)
		return privileges
	}
}

async function authUser (req, res, next) {
	try {
		const { identity, mode, signature, authToken, hash, typedData, signerAddress, prefixed = true } = req.body
		const recoveredAddr = await getAddrFromSignedMsg({ mode, signature, hash, typedData, msg: authToken, prefixed })
		const walletAddress = recoveredAddr.toLowerCase()

		if (walletAddress !== signerAddress.toLowerCase()) {
			return res.status(400).send('Invalid signature')
		}

		const privileges = (await checkWalletPrivileges(identity, walletAddress, true)) || 0

		const sessionExpiryTime = Date.now() + cfg.sessionExpiryTime
		if (privileges > 0) {
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
