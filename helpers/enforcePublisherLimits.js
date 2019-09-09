const BN = require('bn.js')
const getRequest = require('../helpers/getRequest')
const db = require('../db')
const cfg = require('../cfg')

const RELAYER_HOST = process.env.RELAYER_HOST
const CHANNEL_LIMIT = cfg.defaultChannelLimit
const EARNINGS_LIMIT = new BN(cfg.limitedIdentityEarningsLimit)

async function limitCampaigns (req, res, next) {
	const publisherAddr = req.query.limitForPublisher
	if (publisherAddr) {
		req.query.limit = CHANNEL_LIMIT
	}
	return next()
}

async function isAddrLimited (addr) {
	if (!addr) {
		return false
	}

	const data = (await getRequest(`${RELAYER_HOST}/identity/is-limited/${addr}`)) || {}

	return data.isLimited
}

async function getAccOutstandingBalance (addr) {
	const campaignsCol = db.getMongo().collection('campaigns')

	return campaignsCol
		.find(
			{ [`status.lastApprovedBalances.${addr}`]: { '$exists': true } },
			{ projection: { [`status.lastApprovedBalances.${addr}`]: 1 } })
		.toArray()
		.then((campaigns) => {
			const earningsBn = new BN(0)
			const addrBalances = campaigns.reduce((all, c) => {
				if (!c.hasOwnProperty('status.lastApprovedBalances') || !c.lastApprovedBalances.hasOwnProperty(addr)) {
					return all
				}
				return all.add(new BN(c.status.lastApprovedBalances[addr]))
			}, earningsBn)

			return addrBalances
		})
}

async function getIdentityBalance (addr = '') {
	const data = (await getRequest(`${RELAYER_HOST}/identity/balance/${addr}`)) || {}

	return new BN(data.balance || 0)
}

async function enforceLimited (req, res, next) {
	try {
		const publisherAddr = req.query.limitForPublisher
		const isPublisherLimited = await isAddrLimited(publisherAddr)
		if (!isPublisherLimited) {
			return next()
		}

		const [outstanding, addrBalance] = await Promise
			.all([getAccOutstandingBalance(publisherAddr), getIdentityBalance(publisherAddr)])

		const total = outstanding.add(addrBalance)

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

module.exports = { enforceLimited, limitCampaigns }
