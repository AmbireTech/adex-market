const express = require('express')
const url = require('url')
const { BN } = require('bn.js')
const { evaluate } = require('/home/ivo/repos/adex-adview-manager/lib/rules')
const { getWebsitesInfo } = require('../lib/publisherWebsitesInfo')

const db = require('../db')
const cfg = require('../cfg')

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
	const { acceptedReferrers, categories, alexaRank } = await getWebsitesInfo(websitesCol, adSlot)

	const publisherId = adSlot.owner
	const targetingInputBase = {
		adSlotId: id,
		adSlotType: adSlot.type,
		publisherId,
		country: req.headers['cf-ipcountry'],
		eventType: 'IMPRESSION',
		secondsSinceEpoch: Math.floor(Date.now() / 1000),
		// @TODO userAgent* vars
		'adSlot.categories': categories,
		'adSlot.hostname': adSlot.website ? url.parse(adSlot.website).hostname : undefined,
		alexaRank
	}

	// WARNING: be careful if optimizing projections; there's generally no point to do that cause this will be replaced by the Supermarket
	// Also, if `campaign.status` is removed from the projection, the campaignTotalSpent/publisherEarnedFromCampaign variables won't be defined
	const campaignsQuery = {
		'status.name': { $in: ['Active', 'Ready'] },
	}
	if (req.params.depositAsset) campaignsQuery.depositAsset = req.params.depositAsset
	const campaignsActive = await campaignsCol.find(campaignsQuery).toArray()

	// We only allow a publisher to be earning from a certain number of active campaigns at the same time
	// this is done because there's a cost to "sweeping" earnings from channels, so if you're earning from too many it will become cost-prohibitive
	const campaignsByEarner = campaignsActive.filter(c => c.status.lastApprovedBalances[publisherId])
	const campaignsLimitedByEarner = campaignsByEarner.length >= cfg.maxChannelsEarningFrom
		? campaignsByEarner
		: campaignsActive

	const campaigns = campaignsLimitedByEarner
		.map(campaign => {
			// properties we do not care about: validUntil
			const units = campaign.spec.adUnits.filter(u => u.type === adSlot.type)
			if (!units.length) return null

			const targetingRules = (campaign.dynamicSpec && campaign.dynamicSpec.targetingRules)
				|| campaign.spec.targetingRules
				|| shimTargetingRules(campaign)

			const campaignInput = targetingInputGetter.bind(null, targetingInputBase, campaign)
			const matchingUnits = units.map(u => {
				const input = campaignInput.bind(null, u)
				const [minPrice, maxPrice] = getPricingBounds(campaign)
				const output = {
					show: true,
					'price.IMPRESSION': minPrice,
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
				const price = BN.max(minPrice, BN.min(maxPrice, output['price.IMPRESSION']))
				const unit = mapUnit(u)
				return { unit, price: price.toString(10) }
			}).filter(x => x)

			if (matchingUnits.length === 0) return null
			return {
				...mapCampaign(campaign),
				targetingRules,
				units: matchingUnits
			}
		})
		.filter(x => x)

	return {
		targetingInputBase,
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

function targetingInputGetter(base, campaign, unit, propName) {
	if (propName === 'adUnitId' && unit) return unit.ipfs
	if (propName === 'campaignId') return campaign.id
	if (propName === 'advertiserId') return campaign.creator
	if (propName === 'campaignBudget') return new BN(campaign.depositAmount)
	if (propName === 'campaignSecondsActive')
		return Math.max(0, Math.floor((Date.now() - campaign.spec.activeFrom)/1000))
	if (propName === 'campaignSecondsDuration')
		return Math.floor((campaign.spec.withdrawPeriodStart-campaign.spec.activeFrom))
	// skipping for now cause of performance (not obtaining status): campaignTotalSpent, publisherEarnedFromCampaign
	if (propName === 'campaignTotalSpent' && campaign.status) return Object.values(campaign.status.lastApprovedBalances)
		.map(x => new BN(x))
		.reduce((a, b) => a.add(b), new BN(0))
	if (propName === 'publisherEarnedFromCampaign' && campaign.status)
		return new BN(campaign.status.lastApprovedBalances[base.publisherId] || 0)
	if (propName === 'eventMinPrice') return getPricingBounds(campaign, base.eventType)[0]
	if (propName === 'eventMaxPrice') return getPricingBounds(campaign, base.eventType)[1]
	return base[propName]
}

function getPricingBounds(campaign, eventType = 'IMPRESSION') {
	const { pricingBounds, minPerImpression, maxPerImpression } = campaign.spec
	if (pricingBounds && pricingBounds[eventType])
		return [new BN(pricingBounds[eventType].min), new BN(pricingBounds[eventType].max)]
	else if (eventType === 'IMPRESSION')
		return [new BN(minPerImpression || 1), new BN(maxPerImpression || 1)]
	else
		return [new BN(0), new BN(0)]

}

function mapCampaign(campaign, targetingRules, unitsWithPrice) {
	return {
		id: campaign.id,
		depositAmount: campaign.depositAmount,
		depositAsset: campaign.depositAsset,
		creator: campaign.creator,
		spec: {
			withdrawPeriodStart: campaign.spec.withdrawPeriodStart,
			activeFrom: campaign.spec.activeFrom,
		}
	}
}

function mapUnit(u) {
	return {
		id: u.ipfs,
		mediaUrl: u.mediaUrl,
		mediaMime: u.mediaMime,
		targetUrl: u.targetUrl
	}
}


module.exports = router
