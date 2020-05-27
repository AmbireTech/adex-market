const express = require('express')
const url = require('url')
const { BN } = require('bn.js')
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
		// @TODO alexaRank
	}

	// @TODO optimized projections
	// @TODO query by adUnit type?
	const campaignsActive = await campaignsCol.find({
		'status.name': { $in: ['Active', 'Ready'] },
		// @TODO remove this hardcode
		depositAsset: req.params.depositAsset || '0x6B175474E89094C44Da98b954EedeAC495271d0F'
	}, {
		projection: { status: 0 }
	}).toArray()

	// @TODO error handling on rules
	// @TODO return targetingRules
	const campaigns = campaignsActive
		.map(campaign => {
			// properties we do not care about: validUntil, depositAsset
			const units = campaign.spec.adUnits.filter(u => u.type === adSlot.type)
			if (!units.length) return null

			const targetingRules = campaign.targetingRules || campaign.spec.targetingRules || shimTargetingRules(campaign)
			const campaignInput = getTargetingInput(targetingInput, campaign)
			const matchingUnits = units.map(u => {
				const input = { ...campaignInput, adUnitId: u.ipfs }
				const startPrice = new BN(campaign.spec.pricingBounds ? campaign.spec.pricingBounds.IMPRESSION.min : campaign.spec.minPerImpression)
				const output = {
					show: true,
					'price.IMPRESSION': startPrice,
				}
				for (const rule of targetingRules) {
					try {
						evaluate(input, output, rule)
					} catch(e) {
						if (e.isUndefinedVar) continue
						else if (e.isTypeError) console.error(`WARNING: rule for ${campaign.id} failing with:`, e)
						else throw e
					}
					// We stop executing if at any point the show is set to false
					if (output.show === false) return null
				}
				const price = campaign.spec.pricingBounds ?
					BN.min(new BN(campaign.spec.pricingBounds.IMPRESSION.max), output['price.IMPRESSION'])
					: output['price.IMPRESSION']
				const unit = { id: u.ipfs, mediaUrl: u.mediaUrl, mediaMime: u.mediaMime, targetUrl: u.targetUrl }
				return { unit, price: price.toString(10) }
			}).filter(x => x)

			if (matchingUnits.length === 0) return null
			return {
				targetingRules,
				targetingInput: campaignInput,
				units: matchingUnits
			}
		})
		.filter(x => x)

	// unitsWithPrices
	return {
		// @TODO
		targetingInput,
		acceptedReferrers,
		fallbackUnit: adSlot.fallbackUnit,
		campaigns,
	}
}

// @TODO remove that
function shimTargetingRules(campaign) {
	const tags = campaign.spec.adUnits.map(x => x.targeting)
	let categories = []
	for (const unit of campaign.spec.adUnits) {
		for (const tag of unit.targeting) {
			if (tag.tag === 'cryptocurrency' || tag.tag === 'crypto') {
				categories.push('IAB13')
				categories.push('IAB13-11')
			}
			if (tag.tag === 'entertainment media') {
				categories.push('IAB1')
				categories.push('IAB1-5')
			}
			if (tag.tag === 'stremio' || tag.tag === 'stremio_user') {
				categories.push('IAB1')
				categories.push('IAB1-5')
			}
		}
	}
	return [
		//{ onlyShowIf: { intersects: [{ get: 'adSlot.categories' }, categories] } },
		{ onlyShowIf: { nin: [{ get: 'adSlot.categories' }, 'Incentive'] } },
		// one rule with an adview input var, so that we can test that and implement freq cap
		{ onlyShowIf: { gt: [{ get: 'adView.secondsSinceShow' }, 300] } },
	]
}

function getTargetingInput(base, campaign) {
	return {
		...base,
		campaignId: campaign.id,
		advertiserId: campaign.creator,
		// @TODO: BN
		campaignBudget: new BN(campaign.depositAmount),
		campaignSecondsActive: Math.max(0, Math.floor((Date.now() - campaign.spec.activeFrom)/1000)),
		campaignSecondsDuration: Math.floor((campaign.spec.withdrawPeriodStart-campaign.spec.activeFrom)),
		// skipping for now cause of performance (not obtaining status): campaignTotalSpent, publisherEarnedFromCampaign
		//campaignTotalSpent: new BN(campaign.status.fundsDistributedRatio).mul(new BN(campaign.depositAmount)).div(new BN(1000)),
		//publisherEarnedFromCampaign: new BN(campaign.status.lastApprovedBalances[base.publisherId] || 0),
		// @TODO
		// eventMinPrice, eventMaxPrice - from pricingBounds
	}
}


module.exports = router
