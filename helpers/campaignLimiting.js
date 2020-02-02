const BN = require('bn.js')
const db = require('../db')

async function getCampaignsEarningFrom(query, mongoQuery) {
	const campaignsCol = db.getMongo().collection('campaigns')
	const mongoQueryKey = `status.lastApprovedBalances.${query.limitForPublisher}`
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

async function filterCampaignsForPublisher(campaigns, query, mongoQuery) {
	const { publisherChannelLimit, limitForPublisher } = query
	if (isNaN(publisherChannelLimit)) return campaigns
	const limit = parseInt(publisherChannelLimit, 10)
	const campaignsEarningFrom = await getCampaignsEarningFrom(query, mongoQuery)
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
