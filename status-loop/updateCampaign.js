const db = require('../db')

function updateCampaign (campaign, status, lastApproved) {
	const campaignCol = db.getMongo().collection('campaigns')

	return campaignCol.update(
		{ _id: campaign._id },
		{ $set: { status } },
		{ $set: { lastApproved } }
	)
}

module.exports = updateCampaign
