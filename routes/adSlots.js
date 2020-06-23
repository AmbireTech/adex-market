const express = require('express')
const url = require('url')
const { celebrate } = require('celebrate')
const { schemas, AdSlot } = require('adex-models')
const { getAddress, bigNumberify } = require('ethers/utils')

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

		const publisherIds = [identity.toLowerCase(), getAddress(identity)]

		if (identity) {
			query['owner'] = { $in: publisherIds }
		}

		const slots = await adSlotsCol
			.find(query, { projection: { _id: 0 } })
			.skip(skip)
			.limit(limit)
			.toArray()

		if (identity) {
			const websitesCol = db.getMongo().collection('websites')
			const { hosts, passbacks } = slots.reduce(
				(items, { website, fallbackUnit }) => {
					if (website) {
						const { hostname } = url.parse(website)
						items.hosts[hostname] = true
					}

					if (fallbackUnit) {
						items.passbacks[fallbackUnit] = true
					}

					return items
				},
				{ hosts: {}, passbacks: {} }
			)

			const publisherWebsites = await websitesCol
				.find({
					hostname: {
						$in: Object.keys(hosts),
					},
					publisher: { $in: publisherIds },
				})
				.toArray()

			const othersWebsites = await websitesCol
				.find(
					{
						hostname: {
							$in: publisherWebsites.map(({ hostname }) => hostname),
						},
						publisher: { $nin: publisherIds },
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
						othersWebsites.some(({ hostname }) => hostname === hostname)
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

		const validWebsites = await websitesCol
			.aggregate([
				{
					$match: {
						...validQuery,
						webshrinkerCategories: { $exists: true, $not: { $size: 0 } },
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

		const targetingData = validWebsites.map(({ adSlots, ...rest }) => {
			const types = adSlots.reduce(
				(types, slot) => {
					types.add(slot.type)

					return types
				},

				new Set()
			)

			return {
				...rest,
				types: Array.from(types),
			}
		})

		res.set('Cache-Control', `public, max-age=${15 * 60}`)
		res.json(targetingData)
	} catch (err) {
		console.error('Error getting targeting data', err)
		return res.status(500).send(err.toString())
	}
}

module.exports = router
