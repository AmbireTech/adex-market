const BN = require('bn.js')

function shouldWeLimitCampaigns (campaigns, limit, publisherAddr) {
	const campaignsEarningFrom = campaigns.filter((c) => {
		return (c.status.name !== 'Expired') && (c.status.lastApprovedBalances.hasOwnProperty(publisherAddr))
	})

	return campaignsEarningFrom.length > limit
}

function filterCampaignsForPublisher (campaigns, limit, publisherAddr) {
	if (shouldWeLimitCampaigns(campaigns, limit, publisherAddr)) {
		campaigns = campaigns
			.sort((c1, c2) => {
				return new BN(c2.status.lastApprovedBalances[publisherAddr]).gt(new BN(c1.status.lastApprovedBalances[publisherAddr]))
			})
			.splice(0, limit)
	}

	return campaigns
}

module.exports = { filterCampaignsForPublisher }
