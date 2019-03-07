const redisClient = require('../redisInit')

// TODO reconfigure for adex-market redis settings
function signatureCheck (req, res, next) {
	/*
	 * NOTE: when use fetch first is sent OPTIONS req but it does not contains the values for the custom header (just as Access-Control-Request-Headers)
	 * for some reason fetch mode 'cors' sends GET that acts like OPTIONS (no values for custom header)
	 * So we need to skip that check for OPTIONS requests
	 */
	if (req.method === 'OPTIONS') {
		return next()
	}

	let usersig = req.headers['x-user-signature']

	console.log('usersig', usersig)

	if (usersig) {
		redisClient.get('session:' + usersig, (err, reply) => {
			if (err) {
				console.log('redis err', err)
				return res.status(500).send({ error: 'Internal error' })
			}
			if (reply) {
				try {
					req.user = (JSON.parse(reply)).user.toString()
					return next()
				} catch (err) {
					console.log('Redis error: Unable to verify user signature')
					return res.status(403).send({ error: 'Internal error verifying user signature' })
				}
			} else {
				return res.status(403).send({ error: 'Authentication failed' })
			}
		})
	} else {
		console.log('X-User-Signature header missing')
		return res.status(403).send({ error: 'Authentication required' })
	}
}

module.exports = signatureCheck
