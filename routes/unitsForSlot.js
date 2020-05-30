const express = require('express')
const url = require('url')
const UAParser = require('ua-parser-js')
const { BN } = require('bn.js')
const { evaluateMultiple } = require('/home/ivo/repos/adex-adview-manager/lib/rules')
const { targetingInputGetter, getPricingBounds } = require('/home/ivo/repos/adex-adview-manager/lib/helpers')
const { getWebsitesInfo } = require('../lib/publisherWebsitesInfo')
const db = require('../db')
const cfg = require('../cfg')

const GLOBAL_MIN_IMPRESSION_PRICE = new BN(cfg.globalMinImpressionPrice)

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
	const adUnitCol = db.getMongo().collection('adUnits')

	const { id } = req.params
	const adSlot = await adSlotsCol.findOne({ ipfs: id }, { projection: { _id: 0 } })
	if (!adSlot) return res.send(404)
	const { acceptedReferrers, categories, alexaRank } = await getWebsitesInfo(websitesCol, adSlot)

	const publisherId = adSlot.owner
	// Note: variables that are unknown (e.g. alexaRank === null) should be set them to undefined
	// the UA parser adheres to that, since even with an empty string, it will just set properties to undefined
	const ua = UAParser(req.headers['user-agent'])
	const targetingInputBase = {
		adSlotId: id,
		adSlotType: adSlot.type,
		publisherId,
		country: req.headers['cf-ipcountry'],
		eventType: 'IMPRESSION',
		secondsSinceEpoch: Math.floor(Date.now() / 1000),
		userAgentOS: ua.os.name,
		userAgentBrowserFamily: ua.browser.name,
		'adSlot.categories': categories,
		'adSlot.hostname': adSlot.website ? url.parse(adSlot.website).hostname : undefined,
		alexaRank: typeof alexaRank === 'number' ? alexaRank : undefined,
	}

	// WARNING: be careful if optimizing projections; there's generally no point to do that cause this will be replaced by the Supermarket
	// Also, if `campaign.status` is removed from the projection, the campaignTotalSpent/publisherEarnedFromCampaign variables won't be defined
	const campaignsQuery = {
		'status.name': { $in: ['Active', 'Ready'] },
		creator: { $ne: publisherId }
	}
	if (req.params.depositAsset) campaignsQuery.depositAsset = req.params.depositAsset

	// retrieve campaigns/fallback unit together
	const [campaignsActive, fallbackUnit] = await Promise.all([
		campaignsCol.find(campaignsQuery).toArray(),
		adSlot.fallbackUnit
			? adUnitCol.findOne({ ipfs: adSlot.fallbackUnit }).then(mapUnit)
			: Promise.resolve(null)
	])

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
				let output = {
					show: true,
					'price.IMPRESSION': minPrice,
				}
				const onTypeErr = (e, rule) => console.error(`WARNING: rule for ${campaign.id} failing with:`, e, rule)
				output = evaluateMultiple(input, output, targetingRules)

				if (output.show === false) return null

				const price = BN.max(minPrice, BN.min(maxPrice, output['price.IMPRESSION']))

				if (price.lt(GLOBAL_MIN_IMPRESSION_PRICE)) return null

				const unit = mapUnit(u)
				return { unit, price: price.toString(10) }
			}).filter(x => x)

			if (matchingUnits.length === 0) return null
			return {
				...mapCampaign(campaign),
				targetingRules,
				unitsWithPrice: matchingUnits
			}
		})
		.filter(x => x)

	return {
		targetingInputBase,
		acceptedReferrers,
		fallbackUnit,
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
				// or just add a rule that only matches stremio
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
