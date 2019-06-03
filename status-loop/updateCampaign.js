const db = require('../db')

function updateCampaign (campaign, status, lastApprovedSigs, lastApprovedBalances) {
	const campaignCol = db.getMongo().collection('campaigns')
	return campaignCol.update(
		{ _id: campaign._id },
		{ $set: { status, lastApprovedSigs, lastApprovedBalances } }
	)
}

module.exports = updateCampaign
