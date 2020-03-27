const express = require('express')
const url = require('url')
const { celebrate } = require('celebrate')
const { schemas, AdSlot } = require('adex-models')
const { getAddress } = require('ethers/utils')

const db = require('../db')
const { verifyPublisher, validQuery } = require('../lib/publisherVerification')
const addDataToIpfs = require('../helpers/ipfs')
const signatureCheck = require('../helpers/signatureCheck')

const router = express.Router()

router.get('/', getAdSlots)
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
		const identity = req.query.identity
		const limit = +req.query.limit || (identity ? 0 : 100)
		const skip = +req.query.skip || 0
		const adSlotsCol = db.getMongo().collection('adSlots')

		const query = {}

		if (identity) {
			query['$or'] = [
				{ owner: identity.toLowerCase() },
				{ owner: getAddress(identity) },
			]
		}

		const slots = await adSlotsCol
			.find(query, { projection: { _id: 0 } })
			.skip(skip)
			.limit(limit)
			.toArray()

		const websitesQuery = {
			hostname: {
				$in: Object.keys(
					slots.reduce((hosts, { website }) => {
						if (website) {
							const { hostname } = url.parse(website)
							hosts[hostname] = true
						}
						return hosts
					}, {})
				),
			},
			publisher: { $in: [identity.toLowerCase(), getAddress(identity)] },
		}

		const websitesCol = db.getMongo().collection('websites')
		const websitesRes = await websitesCol.find(websitesQuery).toArray()

		const websites = websitesRes.map(ws => ({
			id: ws.hostname,
			issues: getWebsiteIssues(ws),
		}))

		return res.send({ slots, websites })
	} catch (err) {
		console.error('Error getting ad slots', err)
		return res.status(500).send(err.toString())
	}
}

function getRecommendedEarningLimitUSD(website) {
	if (!(website && website.rank)) return 100
	if (website.rank < 10000) return 10000
	else if (website.rank < 100000) return 5000
	else if (website.rank < 300000) return 1000
	else return 100
}
// returning `null` means "everything"
// returning an empty array means "nothing"
async function getAcceptedReferrersInfo(slot) {
	const websitesCol = db.getMongo().collection('websites')
	if (slot.website) {
		// website is set: check if there is a verification
		const { hostname } = url.parse(slot.website)
		// A single website may have been verified by multiple publishers; in this case, we allow the earliest
		// valid verification: this is why we get the first record and check whether publisher == owner
		const website = await websitesCol.findOne({ hostname, ...validQuery })
		// @TODO: consider allowing everything if it's not verified yet (if !website)
		// @XXX: .extraReferrers is only permitted in the new mode (if .website is set)
		const acceptedReferrers =
			website && website.publisher === slot.owner
				? [`https://${hostname}`].concat(
						Array.isArray(website.extraReferrers) ? website.extraReferrers : []
				  )
				: []
		const recommendedEarningLimitUSD = getRecommendedEarningLimitUSD(website)
		return { acceptedReferrers, recommendedEarningLimitUSD }
	} else {
		// A single website may have been verified by multiple publishers
		const websites = await websitesCol
			.find({ publisher: slot.owner, ...validQuery })
			.toArray()
		const websitesDupes = await websitesCol
			.find({
				hostname: { $in: websites.map(x => x.hostname) },
				publisher: { $ne: slot.owner },
				...validQuery,
			})
			.toArray()
		const websitesWithNoDupes = websites.filter(
			x => !websitesDupes.find(y => x.hostname === y.hostname && y._id < x._id)
		)
		const acceptedReferrers = websitesWithNoDupes.map(
			x => `https://${x.hostname}`
		)
		// This case doesn't support recommendedEarningLimitUSD: that's intentional,
		// as it's only used by old publishers who were strictly verified
		return { acceptedReferrers, recommendedEarningLimitUSD: null }
	}
}

function getAdSlotById(req, res) {
	const ipfs = req.params['id']
	const adSlotsCol = db.getMongo().collection('adSlots')

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
				...(await getAcceptedReferrersInfo(result)),
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
		const websitesCol = db.getMongo().collection('websites')

		await websitesCol.updateOne(
			{ publisher: websiteRecord.publisher, hostname: websiteRecord.hostname },
			{ $set: websiteRecord, $setOnInsert: { created: new Date() } },
			{ upsert: true }
		)

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
	const { publisher, hostname, ...rest } = await verifyPublisher(
		identity,
		websiteUrl
	)
	const websitesCol = db.getMongo().collection('websites')

	const existingFromOthers = await websitesCol
		.find(
			{
				hostname,
				publisher: { $ne: publisher },
				...validQuery,
			},
			{ projection: { _id: 0 } }
		)
		.toArray()

	const websiteRecord = {
		hostname,
		publisher,
		...rest,
	}

	return { websiteRecord, existingFromOthers }
}

function getWebsiteIssues(websiteRecord, existingFromOthers) {
	const issues = []
	if (websiteRecord.blacklisted) {
		issues.push('SLOT_ISSUE_BLACKLISTED')
	}
	if (!websiteRecord.verifiedIntegration) {
		issues.push('SLOT_ISSUE_INTEGRATION_NOT_VERIFIED')
	}
	if (!websiteRecord.verifiedOwnership) {
		issues.push('SLOT_ISSUE_OWNERSHIP_NOT_VERIFIED')
	}
	if (existingFromOthers && existingFromOthers.length) {
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

		return res.status(200).send({ hostname: websiteRecord.hostname, issues })
	} catch (err) {
		console.error('Error verifyWebsite', err)
		return res.status(500).send(err.toString())
	}
}

module.exports = router
