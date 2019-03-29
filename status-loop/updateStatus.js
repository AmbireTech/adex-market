const db = require('../db')

function updateStatus (campaign, status) {
	const campaignCol = db.getMongo().collection('campaigns')

	return campaignCol.update(
		{ _id: campaign._id },
		{ $set: { status } }
	)
}

module.exports = updateStatus
