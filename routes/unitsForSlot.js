const express = require('express')
const { evaluate } = require('/home/ivo/repos/adex-adview-manager/lib/rules')
const { getWebsitesInfo } = require('../lib/publisherWebsitesInfo')

const db = require('../db')

const router = express.Router()

router.get('/:id', getUnitsForSlot)

async function getUnitsForSlot(req, res) {
	const adSlotsCol = db.getMongo().collection('adSlots')
	const websitesCol = db.getMongo().collection('websites')

	const { id } = req.params
	const adSlot = await adSlotsCol.findOne({ ipfs: id }, { projection: { _id: 0 } })
	if (!adSlot) return res.send(404)
	// @TODO limit?
	const { acceptedReferrers, categories } = await getWebsitesInfo(websitesCol, adSlot)
	// @TODO websites data
	console.log(adSlot, categories, acceptedReferrers)
	
	res.sendStatus(200)
}


module.exports = router
