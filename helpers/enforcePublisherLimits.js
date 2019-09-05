const getRequest = require('../helpers/getRequest')
const db = require('../db')
const RELAYER_HOST = process.env.RELAYER_HOST
const cfg = require('../cfg')

const EARNINGS_LIMIT = process.env.EARNINGS_LIMIT // TODO this and channel limit might not be env variables
const CHANNEL_LIMIT = cfg.defaultChannelLimit

const BN = require('bn.js')

async function limitCampaigns (req, res, next) {
	const publisherAddr = req.query.limitForPublisher
	if (!publisherAddr) {
		return next()
	}
	req.query.limit = CHANNEL_LIMIT.toString()
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

async function getAccEarnings (addr) {
	const campaignsCol = db.getMongo().collection('campaigns')

	return campaignsCol
		.find(
			{ 'status.lastApprovedBalances': { '$exists': true } },
			{ projection: { 'status.lastApprovedBalances': 1 } })
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

async function enforceLimited (req, res, next) {
	const publisherAddr = req.query.limitForPublisher
	const isPublisherLimited = await isAddrLimited(publisherAddr)
	if (!isPublisherLimited) {
		return next()
	}

	const earnings = await getAccEarnings(publisherAddr)

	return earnings >= EARNINGS_LIMIT
		? res.status(403).send({ error: 'EXCEEDED_EARNINGS_LIMIT' })
		: next()
}

module.exports = { enforceLimited, limitCampaigns }
