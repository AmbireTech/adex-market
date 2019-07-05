const fetch = require('node-fetch')
const db = require('../db').getMongo()
const RELAYER_HOST = process.env.RELAYER_HOST
const EARNINGS_LIMIT = process.env.EARNINGS_LIMIT // TODO might not be an env variable
const CHANNEL_LIMIT = process.env.CHANNEL_LIMIT
const BN = require('bn.js')

async function moreChannelsThanAllowed (addr) {
	const channelsEarningFrom = await earningFrom(addr)
	return channelsEarningFrom > CHANNEL_LIMIT
}

function earningFrom (addr) {
	const campaignsCol = db.collection('campaigns')
	const queryKey = `status.lastApprovedBalances.${addr}`

	const countOfChannels = campaignsCol
		.find({
			'$and': [
				{ [queryKey]: { '$exists': true } },
				{
					'$or': [
						{ 'status.name': 'Active' },
						{ 'status.name': 'Ready' }
					]
				}
			]
		})
		.count()

	return countOfChannels
}

async function isAddrLimited (addr) {
	return  false // TODO uncomment
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
	const campaignsCol = db.collection('campaigns')

	return campaignsCol
		.find(
			{ 'status.lastApprovedBalances': { '$exists': true } },
			{ projection: { 'lastApprovedBalances': 1 } })
		.toArray()
		.then((campaigns) => {
			const earningsBn = new BN(0)
			const addrBalances = campaigns.reduce((all, c) => {
				if (!c.hasOwnProperty('lastApprovedBalances') || !c.lastApprovedBalances.hasOwnProperty(addr)) {
					return all
				}
				return all.add(new BN(c.lastApprovedBalances[addr]))
			}, earningsBn)

			return addrBalances
		})
}

async function enforceLimited (req, res, next) {
	const { publisherAddr } = req.body
	const isPublisherLimited = await isAddrLimited(publisherAddr)
	if (!isPublisherLimited) {
		return next()
	}

	const earnings = await getAccEarnings(publisherAddr)

	return earnings >= EARNINGS_LIMIT
		? res.status(403).send({ error: 'EXCEEDED_EARNINGS_LIMIT' })
		: next()
}

module.exports = { enforceLimited, moreChannelsThanAllowed }
