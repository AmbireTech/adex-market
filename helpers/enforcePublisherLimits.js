const fetch = require('node-fetch')
const db = require('../db').getMongo()
const RELAYER_HOST = process.env.RELAYER_HOST
const EARNINGS_LIMIT = process.env.EARNINGS_LIMIT // TODO might not be an env variable
const BN = require('bn.js')

async function isAddrLimited (addr) {
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
			{ 'lastApprovedBalances': { '$exists': true } },
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

module.exports = enforceLimited
