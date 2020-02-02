const BN = require('bn.js')
const { isIdentityLimited } = require('../helpers/relayer')
const db = require('../db')
const cfg = require('../cfg')

const EARNINGS_LIMIT = new BN(cfg.limitedIdentityEarningsLimit)

// Temporary hotfix
const DISABLE_EARNINGS_LIMIT = true

async function getAccEarned(addr) {
	const campaignsCol = db.getMongo().collection('campaigns')

	return campaignsCol
		.find(
			{ [`status.lastApprovedBalances.${addr}`]: { $exists: true } },
			{ projection: { [`status.lastApprovedBalances.${addr}`]: 1 } }
		)
		.toArray()
		.then(campaigns => {
			const bigZero = new BN(0)
			const addrBalances = campaigns.reduce((all, c) => {
				if (
					!c.hasOwnProperty('status.lastApprovedBalances') ||
					!c.lastApprovedBalances.hasOwnProperty(addr)
				) {
					return all
				}
				all[c.depositAsset] = (c.depositAsset || bigZero).add(
					new BN(c.status.lastApprovedBalances[addr])
				)

				return all
			}, {})

			return addrBalances
		})
}

async function enforceLimited(req, res, next) {
	if (DISABLE_EARNINGS_LIMIT) {
		return next()
	}
	if (!req.query.limitForPublisher) return next()
	try {
		const publisherAddr = req.query.limitForPublisher
		const isPublisherLimited = await isIdentityLimited(publisherAddr)
		if (!isPublisherLimited) {
			return next()
		}

		const outstandingByToken = await getAccEarned(publisherAddr)

		// TODO: not correct sum all tokens as one (it works in current case as DAI and SAI has the same decimals and PRICE)
		const total = Object.values(outstandingByToken).reduce((sum, bal) => {
			return sum.add(bal)
		}, new BN(0))

		if (total.gt(EARNINGS_LIMIT)) {
			return res.status(403).send({ error: 'EXCEEDED_EARNINGS_LIMIT' })
		} else {
			return next()
		}
	} catch (err) {
		console.error('Error on enforcing limited check', err.toString())
		return res.status(500).send(err.toString())
	}
}

module.exports = { enforceLimited }
