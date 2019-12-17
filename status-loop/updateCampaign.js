const db = require('../db')

function updateCampaign (campaign, status) {
	const campaignCol = db.getMongo().collection('campaigns-test')
	return campaignCol.updateOne(
		{ _id: campaign._id },
		{ $set: { status } }
	)
}

module.exports = updateCampaign
