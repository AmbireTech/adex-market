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
		req.query.limit = CHANNEL_LIMIT.toString()
	}
	return next()
}

function isAddrLimited (addr) {
	if (!addr) {
		return false
	}
	return getRequest(`${RELAYER_HOST}/identity/is-limited/${addr}`)
		.then((res) => res.json())
		.then((res) => {
			return res.isLimited
		})
		.catch((err) => {
			throw new Error('Identity with that address not found!', err)
		})
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
	const response = await getRequest(`${RELAYER_HOST}/identity/is-limited/${addr}`)
	const data = (await response.json()) || {}

	return new BN(data.balance || 0)
}

async function enforceLimited (req, res, next) {
	const publisherAddr = req.query.limitForPublisher
	const isPublisherLimited = await isAddrLimited(publisherAddr)
	if (!isPublisherLimited) {
		return next()
	}

	const outstanding = await getAccOutstandingBalance(publisherAddr)
	const addrBalance = await getIdentityBalance(publisherAddr)

	const total = outstanding.add(addrBalance)

	return total.gt(EARNINGS_LIMIT)
		? res.status(403).send({ error: 'EXCEEDED_EARNINGS_LIMIT' })
		: next()
}

module.exports = { enforceLimited, limitCampaigns }
