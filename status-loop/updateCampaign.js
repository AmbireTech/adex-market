const db = require('../db')

function updateCampaign (campaign, status, lastApproved) {
	const campaignCol = db.getMongo().collection('campaigns')

	console.log('lastApproved', lastApproved)

	return campaignCol.update(
		{ _id: campaign._id },
		{ $set: { status, lastApproved } }
	)
}

module.exports = updateCampaign
