const BN = require('bn.js')
const { isIdentityLimited } = require('../helpers/web3/utils')
const { getERC20Contract } = require('../helpers/web3/ethers')
const db = require('../db')
const cfg = require('../cfg')

const CHANNEL_LIMIT = cfg.defaultChannelLimit
const EARNINGS_LIMIT = new BN(cfg.limitedIdentityEarningsLimit)

async function limitCampaigns (req, res, next) {
	if (req.query.limitForPublisher) {
		req.query.publisherChannelLimit = CHANNEL_LIMIT
	}
	return next()
}

async function getAccOutstandingBalance (addr) {
	const campaignsCol = db.getMongo().collection('campaigns')

	return campaignsCol
		.find(
			{ [`status.lastApprovedBalances.${addr}`]: { '$exists': true } },
			{ projection: { [`status.lastApprovedBalances.${addr}`]: 1 } })
		.toArray()
		.then((campaigns) => {
			const bigZero = new BN(0)
			const addrBalances = campaigns.reduce((all, c) => {
				if (!c.hasOwnProperty('status.lastApprovedBalances') || !c.lastApprovedBalances.hasOwnProperty(addr)) {
					return all
				}
				all[c.depositAsset] = (c.depositAsset || bigZero).add(new BN(c.status.lastApprovedBalances[addr]))

				return all
			}, {})

			return addrBalances
		})
}

async function getIdentityBalances (token, identityAddr) {
	const balance = await getERC20Contract(token).balanceOf(identityAddr)

	return balance
}

async function enforceLimited (req, res, next) {
	// TEMP hotfix
	return next()
	try {
		const publisherAddr = req.query.limitForPublisher
		const isPublisherLimited = await isIdentityLimited(publisherAddr)
		if (!isPublisherLimited) {
			return next()
		}

		const outstanding =
			await getAccOutstandingBalance(publisherAddr)

		// TODO: not correct sum all tokens as one (it works in current case as DAI and SAI has the same decimals and PRICE)
		const total = await (Promise.all(Object.entries(outstanding).map(async ([key, value]) => {
			const iddBalance = await getIdentityBalances(key, publisherAddr)
			return value.add(iddBalance)
		}))).reduce((sum, bal) => { return sum.add(bal) }, new BN(0))

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
