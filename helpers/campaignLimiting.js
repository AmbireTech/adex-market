const BN = require('bn.js')

function shouldWeLimitCampaigns (campaigns, limit) {
	return campaigns.length > limit
}

function filterCampaignsForPublisher (campaigns, limit, publisherAddr) {
	if (shouldWeLimitCampaigns(campaigns, limit, publisherAddr)) {
		// Sorting to get those with highest earning first if limit is exceeded
		return campaigns
			.sort((c1, c2) => {
				return new BN(c2.status.lastApprovedBalances[publisherAddr]).gt(new BN(c1.status.lastApprovedBalances[publisherAddr]))
			})
			.splice(0, limit)
	}

	return campaigns
}

module.exports = { filterCampaignsForPublisher }
