const express = require('express')
const { celebrate } = require('celebrate')
const { schemas, AdSlot } = require('adex-models')
const db = require('../db')
const { verifyPublisher, validQuery } = require('../lib/publisherVerification')
const { getWebsitesInfo } = require('../lib/publisherWebsitesInfo')
const addDataToIpfs = require('../helpers/ipfs')
const signatureCheck = require('../helpers/signatureCheck')

const router = express.Router()

router.get('/', getAdSlots)
router.get('/targeting-data', getTargetingData)
router.get('/:id', getAdSlotById)
router.post(
	'/verify-website',
	signatureCheck,
	celebrate({ body: { websiteUrl: schemas.adSlotPost.website } }),
	verifyWebsite
)
router.put(
	'/:id',
	signatureCheck,
	celebrate({ body: schemas.adSlotPut }),
	putAdSlot
)
router.post(
	'/',
	signatureCheck,
	celebrate({ body: schemas.adSlotPost }),
	postAdSlot
)

async function getAdSlots(req, res) {
	try {
		const identity = req.query.identity || ''
		const limit = +req.query.limit || (identity ? 0 : 100)
		const skip = +req.query.skip || 0
		const adSlotsCol = db.getMongo().collection('adSlots')

		const query = {}

		if (identity) {
			query['owner'] = identity
		}

		const slots = await adSlotsCol
			.find(query, { projection: { _id: 0 } })
			.skip(skip)
			.limit(limit)
			.toArray()

		if (identity) {
			const websitesCol = db.getMongo().collection('websites')
			const { passbacks } = slots.reduce(
				(items, { fallbackUnit }) => {
					if (fallbackUnit) {
						items.passbacks[fallbackUnit] = true
					}

					return items
				},
				{ passbacks: {} }
			)

			const publisherWebsites = await websitesCol
				.find({
					publisher: identity,
				})
				.toArray()

			const othersWebsites = await websitesCol
				.find(
					{
						hostname: {
							$in: publisherWebsites.map(({ hostname }) => hostname),
						},
						publisher: { $ne: identity },
						...validQuery,
					},
					{ projection: { hostname: 1 } }
				)
				.toArray()

			const websites = publisherWebsites.map(
				({ hostname, updated, ...rest }) => ({
					id: hostname,
					issues: getWebsiteIssues(
						rest,
						othersWebsites.some(
							({ hostname: otherHostname }) => hostname === otherHostname
						)
					),
					updated,
				})
			)

			const adUnitCol = db.getMongo().collection('adUnits')

			const passbackUnits = await adUnitCol
				.find(
					{
						ipfs: { $in: Object.keys(passbacks) },
					},
					{
						projection: {
							_id: 0,
							id: 1,
							ipfs: 1,
							mediaMime: 1,
							mediaUrl: 1,
							targetUrl: 1,
						},
					}
				)
				.toArray()

			return res.send({ slots, websites, passbackUnits })
		} else {
			return res.send({ slots })
		}
	} catch (err) {
		console.error('Error getting ad slots', err)
		return res.status(500).send(err.toString())
	}
}

async function updateWebsite(website) {
	const websitesCol = db.getMongo().collection('websites')

	await websitesCol.updateOne(
		{ publisher: website.publisher, hostname: website.hostname },
		{ $set: website, $setOnInsert: { created: new Date() } },
		{ upsert: true }
	)
}

function getAdSlotById(req, res) {
	const ipfs = req.params['id']
	const adSlotsCol = db.getMongo().collection('adSlots')
	const websitesCol = db.getMongo().collection('websites')

	return adSlotsCol
		.findOne({ ipfs }, { projection: { _id: 0 } })
		.then(async result => {
			if (!result) {
				res.status(404).send('Ad Slot not found') // TODO? replace with code to add to translations
				return
			}
			res.set('Cache-Control', 'public, max-age=10000')
			res.send({
				slot: result,
				...(await getWebsitesInfo(websitesCol, result)),
			})
		})
		.catch(err => {
			console.error('Error getting slot by id', err)
			return res.status(500).send(err.toString())
		})
}

async function postAdSlot(req, res) {
	try {
		const identity = req.identity
		const adSlotsCol = db.getMongo().collection('adSlots')
		const adSlot = new AdSlot(req.body)
		adSlot.owner = identity
		adSlot.created = new Date()

		const { websiteRecord } = await getWebsiteData(identity, adSlot.website)

		await updateWebsite(websiteRecord)

		const dataHash = await addDataToIpfs(
			Buffer.from(JSON.stringify(adSlot.spec))
		)
		adSlot['ipfs'] = dataHash

		await adSlotsCol.insertOne(adSlot.marketDbAdd)

		return res.send(adSlot.plainObj())
	} catch (err) {
		console.error('Error adding adSlot', err)
		return res.status(500).send(err.toString())
	}
}

function putAdSlot(req, res) {
	const adSlot = new AdSlot(req.body)
	adSlot.modified = new Date()
	const adSlotsCol = db.getMongo().collection('adSlots')
	const ipfs = req.params.id
	return adSlotsCol.findOneAndUpdate(
		{ ipfs },
		{
			$set: adSlot.marketDbUpdate,
		},
		{ returnOriginal: false },
		(err, result) => {
			if (err) {
				console.error('Error updating slot', err)
				return res.status(500).send(err.toString())
			}
			return res.status(200).send({ slot: result.value })
		}
	)
}

async function getWebsiteData(identity, websiteUrl) {
	const { publisher, hostname, updated, ...rest } = await verifyPublisher(
		identity,
		websiteUrl
	)
	const websitesCol = db.getMongo().collection('websites')

	const { verifiedForce } = (await websitesCol.findOne(
		{ publisher, hostname },
		{ projection: { verifiedForce: 1 } }
	)) || { verifiedForce: false }

	const existingFromOthers = await websitesCol
		.find({
			hostname,
			publisher: { $ne: publisher },
			...validQuery,
		})
		.count()

	const websiteRecord = {
		hostname,
		publisher,
		...rest,
		verifiedForce,
		updated,
	}

	return { websiteRecord, existingFromOthers }
}

function getWebsiteIssues(websiteRecord, existingFromOthers) {
	const issues = []
	if (websiteRecord.blacklisted) {
		issues.push('SLOT_ISSUE_BLACKLISTED')
	}
	if (!websiteRecord.verifiedOwnership) {
		issues.push('SLOT_ISSUE_OWNERSHIP_NOT_VERIFIED')
	}
	if (existingFromOthers) {
		issues.push('SLOT_ISSUE_SOMEONE_ELSE_VERIFIED')
	}

	return issues
}

const DEFAULT_MIN_CPM = 0.1

const DefaultMinCPMByCategory = {
	IAB1: 0.5, // 'Arts & Entertainment'
	IAB2: 0.5, // 'Automotive'
	IAB3: 0.6, //'Business'
	IAB4: 0.69, //'Careers'
	IAB5: 0.42, //'Education'
	IAB6: 0.33, //'Family & Parenting'
	IAB7: 0.69, //'Health & Fitness'
	IAB8: 0.28, //'Food & Drink'
	IAB9: 0.5, //'Hobbies & Interests'
	IAB10: 0.2, //'Home & Garden'
	IAB11: 2.444, //'Law, Government, & Politics'
	IAB12: 0.6, //'News / Weather / Information'
	IAB13: 1, //'Personal Finance'
	IAB14: 0.2, //'Society'
	IAB15: 0.42, //'Science'
	IAB16: 0.4, //'Pets'
	IAB17: 0.72, //'Sports'
	IAB18: 0.69, //'Style & Fashion'
	IAB19: 0.314, //'Technology & Computing'
	IAB20: 0.7, //'Travel'
	IAB21: 0.9, //'Real Estate'
	IAB22: 0.6, //'Shopping'
	IAB23: 2.666, // 'Religion & Spirituality'
	IAB24: DEFAULT_MIN_CPM, //'Uncategorize'
	IAB25: 0.2, //"Non-Standard Content"
	IAB26: 2.69, //'Illegal Content'
}

const DefaultCoefficientByCountryTier = {
	TIER_1: 2.5,
	TIER_2: 2,
	TIER_3: 1.5,
	TIER_4: 1,
}

function getLevelOneCategory(cat) {
	return cat.split('-')[0]
}

const MIN_SLOT_CPM_OVERALL_MULTIPLIER = 0.7777

function getMinSuggestedCPM(categories) {
	const minCpm =
		categories
			.map(c => DefaultMinCPMByCategory[getLevelOneCategory(c)])
			.sort()[0] || DEFAULT_MIN_CPM

	return (
		minCpm *
		DefaultCoefficientByCountryTier['TIER_4'] *
		MIN_SLOT_CPM_OVERALL_MULTIPLIER
	).toFixed(2)
}

async function verifyWebsite(req, res) {
	try {
		const { websiteRecord, existingFromOthers } = await getWebsiteData(
			req.identity,
			req.body.websiteUrl
		)

		const issues = getWebsiteIssues(websiteRecord, existingFromOthers)

		await updateWebsite(websiteRecord)

		return res.status(200).send({
			hostname: websiteRecord.hostname,
			issues,
			categories: websiteRecord.webshrinkerCategories,
			suggestedMinCPM: getMinSuggestedCPM(websiteRecord.webshrinkerCategories),
			updated: websiteRecord.updated,
		})
	} catch (err) {
		console.error('Error verifyWebsite', err)
		return res.status(500).send(err.toString())
	}
}

async function getTargetingData(req, res) {
	try {
		const websitesCol = db.getMongo().collection('websites')
		const campaignsCol = db.getMongo().collection('campaigns')

		const validWebsites = await websitesCol
			.aggregate([
				{
					$match: {
						...validQuery,
						//NOTE: check for webshrinkerCategories at the platform
					},
				},
				{
					$group: {
						_id: {
							hostname: '$hostname',
						},
						hostname: {
							$first: '$hostname',
						},
						categories: {
							$first: '$webshrinkerCategories',
						},
						owner: {
							$first: '$publisher',
						},
						alexaRank: {
							$first: '$rank',
						},
						alexaDataUrl: {
							$first: '$alexaDataUrl',
						},
						reachPerMillion: {
							$first: '$reachPerMillion',
						},
					},
				},
				{
					$lookup: {
						from: 'adSlots',
						localField: 'owner',
						foreignField: 'owner',
						as: 'adSlots',
					},
				},
				{
					$project: {
						_id: 0,
						hostname: 1,
						owner: 1,
						categories: 1,
						alexaRank: 1,
						alexaDataUrl: 1,
						reachPerMillion: 1,
						adSlots: {
							type: 1,
						},
					},
				},
			])
			.toArray()

		const publishersWithRevenue = {}

		await campaignsCol
			.aggregate([
				{
					$match: {
						'status.lastApprovedBalances': { $exists: true },
					},
				},
				{
					$project: {
						publishers: {
							$map: {
								input: { $objectToArray: '$status.lastApprovedBalances' },
								as: 'kv',
								in: '$$kv',
							},
						},
					},
				},
				{
					$unwind: '$publishers',
				},
				{
					$group: {
						_id: '$publishers.k',
						campaignsEarnedFrom: {
							$sum: 1,
						},
						totalEarned: { $sum: { $toDecimal: '$publishers.v' } },
					},
				},
				{
					$project: {
						_id: 1,
						campaignsEarnedFrom: 1,
						totalEarned: { $toString: '$totalEarned' },
					},
				},
			])
			.forEach(item => {
				publishersWithRevenue[item._id] = {
					campaignsEarnedFrom: item.campaignsEarnedFrom,
					totalEarned: item.totalEarned,
				}
			})

		// TODO: Make this mapping in the pipeline
		const targetingData = validWebsites.map(({ adSlots, owner, ...rest }) => {
			const types = adSlots.reduce(
				(types, slot) => {
					types.add(slot.type)

					return types
				},

				new Set()
			)

			const publisherData = publishersWithRevenue[owner] || {}

			return {
				owner,
				...rest,
				// NOTE: this is per owner, no by slot
				campaignsEarnedFrom: publisherData.campaignsEarnedFrom,
				totalEarned: publisherData.totalEarned,
				types: Array.from(types),
			}
		})

		const minByCategory = DefaultMinCPMByCategory
		const countryTiersCoefficients = DefaultCoefficientByCountryTier

		res.set('Cache-Control', `public, max-age=${15 * 60}`)
		res.json({
			targetingData,
			minByCategory,
			countryTiersCoefficients,
		})
	} catch (err) {
		console.error('Error getting targeting data', err)
		return res.status(500).send(err.toString())
	}
}

module.exports = router
