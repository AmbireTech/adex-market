const BN = require('bn.js')

function shouldWeLimitCampaigns (filteredCampaigns, limit) {
	return filteredCampaigns.length > limit
}

function filterCampaignsForPublisher (campaigns, limit, publisherAddr) {
	if (shouldWeLimitCampaigns(campaigns, limit, publisherAddr)) {
		// Sorting to get those with highest earning first if limit is exceeded
		const filtered = campaigns.sort((c1, c2) => {
			const c1Balance = new BN(c1.status.lastApprovedBalances[publisherAddr])
			const c2Balance = new BN(c2.status.lastApprovedBalances[publisherAddr])
			return c1Balance.gte(c2Balance) ? -1 : 1
		}).splice(0, limit)
		return filtered
	}

	return campaigns
}

module.exports = { filterCampaignsForPublisher }
