const db = require('../db')

function updateStatus (campaign, status) {
	const campaignCol = db.getMongo().collection('campaigns')

	return campaignCol.findOneAndUpdate(
		{ _id: campaign._id },
		{ $set:
			{ status: status }
		})
}

module.exports = updateStatus
