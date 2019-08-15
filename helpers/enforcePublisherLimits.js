const fetch = require('node-fetch')
const db = require('../db')
const RELAYER_HOST = process.env.RELAYER_HOST

const EARNINGS_LIMIT = process.env.EARNINGS_LIMIT // TODO this and channel limit might not be env variables
const CHANNEL_LIMIT = process.env.CHANNEL_LIMIT

const BN = require('bn.js')

async function limitCampaigns (req, res, next) {
	const { publisherAddr } = req.query
	if (!publisherAddr) {
		return next()
	}
	const channelsEarningFrom = await earningFrom(publisherAddr)
	if (channelsEarningFrom >= CHANNEL_LIMIT) {
		req.query.limit = CHANNEL_LIMIT.toString()
	}
	return next()
}

async function earningFrom (addr) {
	const campaignsCol = db.getMongo().collection('campaigns')
	const queryKey = `status.lastApprovedBalances.${addr}`

	const earningCampaignsCount = await campaignsCol
		.find({
			'$and': [
				{ [queryKey]: { '$exists': true } },
				{
					'status.name': 'Active'
				}
			]
		})
		.count()

	return earningCampaignsCount
}

async function isAddrLimited (addr) {
	if (process.env.NODE_ENV === 'production') { return false } // TODO remove this line when relayer is configured for this

	return fetch(`${RELAYER_HOST}/TODO`, { // TODO: Do this when ready might be just a GET
		method: 'POST',
		headers: {
			'Content-type': 'application/json'
		},
		body: JSON.stringify({ addr })
	})
		.then((res) => res.json())
		.then((res) => {
			return res.privilleges > 1
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
	const { publisherAddr } = req.query
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
