const BN = require('bn.js')
const db = require('../db')
const cfg = require('../cfg')

async function getCampaignsEarningFrom(limitForPublisher, mongoQuery) {
	const campaignsCol = db.getMongo().collection('campaigns')
	const mongoQueryKey = `status.lastApprovedBalances.${limitForPublisher}`
	const findQuery = {
		...mongoQuery,
		[mongoQueryKey]: {
			$exists: true,
		},
	}
	return campaignsCol
		.find(findQuery)
		.toArray()
		.then(campaigns => {
			return campaigns
		})
}

async function filterCampaignsForPublisher(
	campaigns,
	limitForPublisher,
	mongoQuery
) {
	if (!limitForPublisher) return campaigns
	const limit = cfg.maxChannelsEarningFrom
	const campaignsEarningFrom = await getCampaignsEarningFrom(
		limitForPublisher,
		mongoQuery
	)
	if (campaignsEarningFrom.length > limit) {
		// Sorting to get those with highest earning first if limit is exceeded
		return campaignsEarningFrom
			.sort((c1, c2) => {
				const c1Balance = new BN(
					c1.status.lastApprovedBalances[limitForPublisher]
				)
				const c2Balance = new BN(
					c2.status.lastApprovedBalances[limitForPublisher]
				)
				return c1Balance.gte(c2Balance) ? -1 : 1
			})
			.slice(0, limit)
	}
	return campaigns
}

module.exports = { filterCampaignsForPublisher }
