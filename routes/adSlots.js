const express = require('express')
const url = require('url')
const { celebrate } = require('celebrate')
const { schemas, AdSlot } = require('adex-models')
const { getAddress } = require('ethers/utils')

const db = require('../db')
const { verifyPublisher } = require('../lib/publisherVerification')
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
						const { hostname } = url.parse(website)
						hosts[hostname] = true
						return hosts
					}, {})
				),
			},
			publisher: { $in: [identity.toLowerCase(), getAddress(identity)] },
		}

		const websitesCol = db.getMongo().collection('websites')
		const websitesRes = await websitesCol.find(websitesQuery).toArray()

		const websites = websitesRes.reduce((all, ws) => {
			all[ws.hostname] = { issues: getWebsiteIssues(ws) }
			return all
		}, {})

		return res.send({ slots, websites })
	} catch (err) {
		console.error('Error getting ad slots', err)
		return res.status(500).send(err.toString())
	}
}

// returning `null` means "everything"
// returning an empty array means "nothing"
async function getAcceptedReferrers(slot) {
	const validQuery = {
		$or: [
			{ verifiedIntegration: true },
			{ verifiedOwnership: true },
			{ verifiedForce: true },
		],
		blacklisted: { $ne: true },
	}
	const websitesCol = db.getMongo().collection('websites')
	if (slot.website) {
		// website is set: check if there is a verification
		const { hostname } = url.parse(slot.website)
		// A single website may have been verified by multiple publishers; in this case, we allow the earliest
		// valid verification: this is why we get the first record and check whether publisher == owner
		const website = await websitesCol.findOne({ hostname, ...validQuery })
		// @TODO: consider allowing everything if it's not verified yet (if !website)
		// @XXX: .extraReferrers is only permitted in the new mode (if .website is set)
		return website && website.publisher === slot.owner
			? [`https://${hostname}`].concat(
					Array.isArray(website.extraReferrers) ? website.extraReferrers : []
			  )
			: []
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
		return websitesWithNoDupes.map(x => `https://${x.hostname}`)
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
				acceptedReferrers: await getAcceptedReferrers(result),
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

		const websiteData = await getWebsiteData(identity, adSlot.website)
		const websitesCol = db.getMongo().collection('websites')

		await websitesCol.updateOne(
			{ publisher: websiteData.publisher, hostname: websiteData.hostname },
			{ $set: websiteData },
			{ upsert: true }
		)

		const dataHash = await addDataToIpfs(
			Buffer.from(JSON.stringify(adSlot.spec))
		)
		adSlot['ipfs'] = dataHash

		const inserted = await adSlotsCol.insertOne(adSlot.marketDbAdd)
		console.log('inserted', inserted)
		return res.send(adSlot)
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

	const existing = (await websitesCol.findOne({ publisher, hostname })) || {}

	const data = {
		hostname,
		publisher,
		...existing,
		...rest,
		created: existing.created || new Date(),
	}

	return data
}

function getWebsiteIssues(data) {
	const issues = []
	if (data.blacklisted) {
		issues.push('SLOT_ISSUE_BLACKLISTED')
	}
	if (!data.verifiedIntegration) {
		issues.push('SLOT_ISSUE_INTEGRATION_NOT_VERIFIED')
	}
	if (!data.verifiedOwnership) {
		issues.push('SLOT_ISSUE_OWNERSHIP_NOT_VERIFIED')
	}

	return issues
}

async function verifyWebsite(req, res) {
	try {
		const data = await getWebsiteData(req.identity, req.body.websiteUrl)

		const issues = getWebsiteIssues(data)

		return res.status(200).send({ hostname: data.hostname, issues })
	} catch (err) {
		console.error('Error verifyWebsite', err)
		return res.status(500).send(err.toString())
	}
}

module.exports = router
