const express = require('express')
const redisClient = require('../redisInit')
const { getAddrFromSignedMsg } = require('../helpers/web3/utils')
const cfg = require('../cfg')
const { provider, ethers } = require('../helpers/web3/ethers')
const identityAbi = require('../helpers/web3/abi/Identity')
const { getWalletPrivileges } = require('../helpers/relayer')

const router = express.Router()

router.post('/', authUser)

async function checkWalletPrivileges (identity, walletAddr) {
	try {
		const contract = new ethers.Contract(identity, identityAbi, provider)
		const privileges = await contract.privileges(walletAddr)
		return privileges
	} catch (err) {
		const privileges = await getWalletPrivileges(identity, walletAddr)
		return privileges
	}
}

async function authUser (req, res, next) {
	try {
		const { identity, mode, signature, authToken, hash, typedData, signerAddress, prefixed = true } = req.body
		const recoveredAddr = await getAddrFromSignedMsg({ mode, signature, hash, typedData, msg: authToken, prefixed })
		const walletAddress = recoveredAddr.addr
		if (walletAddress !== signerAddress) {
			return res.status(400).send('Invalid signature')
		}

		const privileges = (await checkWalletPrivileges(identity, walletAddress, true)) || 0
		const sessionExpiryTime = Date.now() + cfg.sessionExpiryTime
		if (privileges) {
			redisClient.set('session:' + signature,
				JSON.stringify({
					'address': walletAddress,
					'authToken': authToken,
					'mode': mode,
					'identity': identity,
					'privileges': res.privileges
				}),
				(err, result) => {
					if (err != null) {
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
