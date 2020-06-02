const express = require('express')
const url = require('url')
const UAParser = require('ua-parser-js')
const { BN } = require('bn.js')
const { evaluateMultiple } = require('adex-adview-manager/lib/rules')
const {
	targetingInputGetter,
	getPricingBounds,
} = require('adex-adview-manager/lib/helpers')
const { getWebsitesInfo } = require('../lib/publisherWebsitesInfo')
const db = require('../db')
const cfg = require('../cfg')

const GLOBAL_MIN_IMPRESSION_PRICE = new BN(cfg.globalMinImpressionPrice)

const router = express.Router()

router.get('/:id', getUnitsForSlotRoute)

function getUnitsForSlotRoute(req, res) {
	getUnitsForSlot(req)
		.then(resp => {
			if (!resp) res.sendStatus(404)
			else res.send(resp)
		})
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
	const adSlot = await adSlotsCol.findOne(
		{ ipfs: id },
		{ projection: { _id: 0 } }
	)
	if (!adSlot) return null
	const { acceptedReferrers, categories, alexaRank } = await getWebsitesInfo(
		websitesCol,
		adSlot
	)

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
		'adSlot.hostname': adSlot.website
			? url.parse(adSlot.website).hostname
			: undefined,
		'adSlot.alexaRank': typeof alexaRank === 'number' ? alexaRank : undefined,
	}

	// WARNING: be careful if optimizing projections; there's generally no point to do that cause this will be replaced by the Supermarket
	// Also, if `campaign.status` is removed from the projection, the campaignTotalSpent/publisherEarnedFromCampaign variables won't be defined
	const campaignsQuery = {
		'status.name': { $in: ['Active', 'Ready'] },
		creator: { $ne: publisherId },
	}
	if (Array.isArray(req.query.depositAsset))
		campaignsQuery.depositAsset = { $in: req.query.depositAsset }
	if (typeof req.query.depositAsset === 'string')
		campaignsQuery.depositAsset = req.query.depositAsset

	// retrieve campaigns/fallback unit together
	const [campaignsActive, fallbackUnit] = await Promise.all([
		campaignsCol.find(campaignsQuery).toArray(),
		adSlot.fallbackUnit
			? adUnitCol.findOne({ ipfs: adSlot.fallbackUnit }).then(mapUnit)
			: Promise.resolve(null),
	])

	// We only allow a publisher to be earning from a certain number of active campaigns at the same time
	// this is done because there's a cost to "sweeping" earnings from channels, so if you're earning from too many it will become cost-prohibitive
	const campaignsByEarner = campaignsActive.filter(
		c => c.status.lastApprovedBalances[publisherId]
	)
	const campaignsLimitedByEarner =
		campaignsByEarner.length >= cfg.maxChannelsEarningFrom
			? campaignsByEarner
			: campaignsActive

	const campaigns = campaignsLimitedByEarner
		.map(campaign => {
			// properties we do not care about: validUntil
			const units = campaign.spec.adUnits.filter(u => u.type === adSlot.type)
			if (!units.length) return null

			const targetingRules = campaign.targetingRules || campaign.spec.targetingRules || []
			const adSlotRules = Array.isArray(adSlot.rules) ? adSlot.rules : []

			const campaignInput = targetingInputGetter.bind(
				null,
				targetingInputBase,
				campaign
			)
			const onTypeErr = function onTypeErr(e, rule) {
				console.error(`WARNING: rule for ${campaign.id} failing with:`, e, rule)
			}
			const matchingUnits = units
				.map(u => {
					const input = campaignInput.bind(null, u)
					const [minPrice, maxPrice] = getPricingBounds(campaign)
					let output = {
						show: true,
						'price.IMPRESSION': minPrice,
					}

					output = evaluateMultiple(input, output, targetingRules, onTypeErr)

					if (output.show === false) return null

					const price = BN.max(
						minPrice,
						BN.min(maxPrice, output['price.IMPRESSION'])
					)
					if (price.lt(GLOBAL_MIN_IMPRESSION_PRICE)) return null

					// Execute the adSlot rules after we've taken the price since they're not
					// allowed to change the price
					if (!evaluateMultiple(input, output, adSlotRules, onTypeErr).show)
						return null

					const unit = mapUnit(u)
					return { unit, price: price.toString(10) }
				})
				.filter(x => x)

			if (matchingUnits.length === 0) return null
			return {
				...mapCampaign(campaign),
				targetingRules,
				unitsWithPrice: matchingUnits,
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

function mapCampaign(campaign) {
	return {
		id: campaign.id,
		depositAmount: campaign.depositAmount,
		depositAsset: campaign.depositAsset,
		creator: campaign.creator,
		spec: {
			withdrawPeriodStart: campaign.spec.withdrawPeriodStart,
			activeFrom: campaign.spec.activeFrom,
			validators: campaign.spec.validators,
		},
	}
}

function mapUnit(u) {
	return {
		id: u.ipfs,
		mediaUrl: u.mediaUrl,
		mediaMime: u.mediaMime,
		targetUrl: u.targetUrl,
	}
}

module.exports = router
