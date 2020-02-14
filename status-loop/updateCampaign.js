const db = require('../db')

function updateCampaign(campaign, status) {
	const campaignCol = db.getMongo().collection('campaigns')
	const newStatus = { ...campaign.status, ...status }
	return campaignCol.updateOne(
		{ _id: campaign._id },
		{ $set: { status: newStatus } }
	)
}

module.exports = updateCampaign
