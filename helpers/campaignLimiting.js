const BN = require('bn.js')

function getFilteredCampaigns (campaigns, publisherAddr) {
	const filteredCampaigns = campaigns.filter((c) => {
		return (c.status.name !== 'Expired') && (c.status.lastApprovedBalances.hasOwnProperty(publisherAddr))
	})

	return filteredCampaigns
}

function shouldWeLimitCampaigns (filteredCampaigns, limit) {
	return filteredCampaigns.length > limit
}

function filterCampaignsForPublisher (campaigns, limit, publisherAddr) {
	const filteredCampaigns = getFilteredCampaigns(campaigns, publisherAddr)
	if (shouldWeLimitCampaigns(filteredCampaigns, limit, publisherAddr)) {
		const returnedCampaigns = filteredCampaigns
			.sort((c1, c2) => {
				return new BN(c2.status.lastApprovedBalances[publisherAddr]).gt(new BN(c1.status.lastApprovedBalances[publisherAddr]))
			})
			.splice(0, limit)
		return returnedCampaigns
	}

	return filteredCampaigns
}

module.exports = { filterCampaignsForPublisher }
