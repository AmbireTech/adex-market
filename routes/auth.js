const express = require('express')
const redisClient = require('../redisInit')
const { getAddrFromSignedMsg } = require('../helpers/web3/utils')
const cfg = require('../cfg')
const { getWalletPrivileges } = require('../helpers/relayer')

const router = express.Router()

router.post('/', authUser)

async function authUser(req, res) {
	try {
		const {
			identity,
			mode,
			signature,
			authToken,
			hash,
			typedData,
			signerAddress,
			prefixed = true,
		} = req.body
		const recoveredAddr = await getAddrFromSignedMsg({
			mode,
			signature,
			hash,
			typedData,
			msg: authToken,
			prefixed,
		})
		const walletAddress = recoveredAddr
		if (walletAddress !== signerAddress) {
			return res.status(400).send('Invalid signature')
		}

		const privileges = await getWalletPrivileges(identity, recoveredAddr)

		if (privileges) {
			const sessionExpiryTime = Date.now() + cfg.sessionExpiryTime

			redisClient.set(
				'session:' + signature,
				JSON.stringify({
					address: recoveredAddr,
					authToken: authToken,
					mode: mode,
					identity: identity,
					privileges: res.privileges,
				}),
				err => {
					if (err != null) {
						console.error(
							'Error saving session data for user ' + recoveredAddr + ' :' + err
						)
						return res.status(500).send('Db write error')
					} else {
						redisClient.expire(
							'session:' + signature,
							sessionExpiryTime,
							() => {}
						)
						return res.send({
							status: 'OK',
							identity: identity,
							signature: signature,
							expiryTime: sessionExpiryTime,
						})
					}
				}
			)
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
