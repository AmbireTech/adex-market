const express = require('express')
const url = require('url')
const { evaluate } = require('/home/ivo/repos/adex-adview-manager/lib/rules')
const { getWebsitesInfo } = require('../lib/publisherWebsitesInfo')

const db = require('../db')

const router = express.Router()

router.get('/:id', getUnitsForSlotRoute)

function getUnitsForSlotRoute(req, res) {
	getUnitsForSlot(req)
		.then(resp => res.send(resp))
		.catch(e => {
			console.error(e)
			res.sendStatus(500)
		})
}

async function getUnitsForSlot(req) {
	const adSlotsCol = db.getMongo().collection('adSlots')
	const websitesCol = db.getMongo().collection('websites')
	const campaignsCol = db.getMongo().collection('campaigns')

	const { id } = req.params
	const adSlot = await adSlotsCol.findOne({ ipfs: id }, { projection: { _id: 0 } })
	if (!adSlot) return res.send(404)
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

	// @TODO depositAsset
	// @TODO optimized projections
	// @TODO query by adUnit type?
	const campaignsActive = await campaignsCol.find({
		'status.name': { $in: ['Active', 'Ready'] },
		// @TODO remove this hardcode
		depositAsset: req.params.depositAsset || '0x6B175474E89094C44Da98b954EedeAC495271d0F'
	}, {
		projection: { status: 0 }
	}).toArray()

	const campaigns = campaignsActive
		.map(campaign => {
			const { id, depositAsset, depositAmount, creator } = campaign
			console.log(campaign.spec.adUnits)
			const units = campaign.spec.adUnits.filter(u => u.type === adSlot.type)
			if (!units.length) return null

			const targetingRules = campaign.targetingRules || campaign.spec.targetingRules || shimTargetingRules(campaign)
			// @TODO: should we return status, e.g. lastApprovedBalances? perhaps not, since we can include this in targetingInput
			const targetingInput = {
				campaignId: id,
				advertiserId: creator,
				// @TODO: BN
				campaignBudget: depositAmount,
			}
			const unitsWithPrice = units.map(u => ({ mediaUrl: u.mediaUrl, mediaMime: u.mediaMime, targetUrl: u.targetUrl }))
			return { targetingRules, targetingInput, unitsWithPrice }
		})
		.filter(campaign => campaign)

	// unitsWithPrices
	return {
		targetingInput,
		acceptedReferrers,
		fallbackUnit: adSlot.fallbackUnit,
		campaigns,
	}
}

// @TODO remove that
function shimTargetingRules(campaign) {
}


module.exports = router
