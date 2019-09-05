const db = require('../db')
const initialValidators = require('../cfg').initialValidators

function fillInitialValidators () {
	const validatorsCol = db.getMongo().collection('validators')
	const validatorsAsObj = initialValidators.map((v) => {
		return { url: v }
	})
	const updated = validatorsAsObj.map((v) => {
		return validatorsCol.updateOne({ url: v.url }, { $setOnInsert: v }, { upsert: true })
	})

	return Promise.all(updated)
}

module.exports = fillInitialValidators
