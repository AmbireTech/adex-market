const express = require('express')
const url = require('url')
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
	// @TODO recommendedEarningLimitUSD?
	const { acceptedReferrers, categories } = await getWebsitesInfo(websitesCol, adSlot)

	const targetingInput = {
		adSlotId: id,
		adSlotType: adSlot.type,
		publisherId: adSlot.owner,
		country: req.headers['cf-ipcountry'],
		eventType: 'IMPRESSION',
		secondsSinceEpoch: Math.floor(Date.now() / 1000),
		// @TODO userAgent* vars 
		'adSlot.categories': categories,
		'adSlot.hostname': adSlot.website ? url.parse(adSlot.website).hostname : undefined,
		// @TODO rank
	}
	res.send({
		targetingInput,
		acceptedReferrers,
		fallbackUnit: adSlot.fallbackUnit,
	})
}


module.exports = router
