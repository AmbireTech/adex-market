const BN = require('bn.js')
const db = require('../db')
const cfg = require('../cfg')

async function getCampaignsEarningFrom(publisher, mongoQuery) {
	const campaignsCol = db.getMongo().collection('campaigns')
	const mongoQueryKey = `status.lastApprovedBalances.${publisher}`
	const findQuery = {
		...mongoQuery,
		[mongoQueryKey]: {
			$exists: true,
		},
	}
	return campaignsCol.find(findQuery).toArray()
}

async function filterCampaignsForPublisher(campaigns, publisher, mongoQuery) {
	const limit = cfg.maxChannelsEarningFrom
	const campaignsEarningFrom = await getCampaignsEarningFrom(
		publisher,
		mongoQuery
	)
	// NOTE: when computing totalEarned, we are disregarding the depositAsset, cause it will
	// always be pegged to USD and 18 decimals
	const totalEarned = campaignsEarningFrom
		.map(c => new BN(c.status.lastApprovedBalances[publisher]))
		.reduce((c1, c2) => c1.add(c2), new BN(0))
	if (campaignsEarningFrom.length > limit) {
		// Sorting to get those with highest earning first if limit is exceeded
		return {
			totalEarned,
			campaigns: campaignsEarningFrom
				.sort((c1, c2) => {
					const c1Balance = new BN(c1.status.lastApprovedBalances[publisher])
					const c2Balance = new BN(c2.status.lastApprovedBalances[publisher])
					return c1Balance.gte(c2Balance) ? -1 : 1
				})
				.slice(0, limit),
		}
	}
	return { totalEarned, campaigns }
}

module.exports = { filterCampaignsForPublisher }
