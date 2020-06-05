const express = require('express')
const db = require('../db')
const signatureCheck = require('../helpers/signatureCheck')
const { noCache } = require('../helpers/cache')
// const { schemas } = require('adex-models')
// const { celebrate } = require('celebrate')
const { getAddress } = require('ethers/utils')

const router = express.Router()

router.get('/by-owner', noCache, signatureCheck, getAudiencesByOwner)
router.get('/:campaignId', signatureCheck, getAudience)
router.put(
	'/:campaignId',
	signatureCheck,
	// celebrate({ body: schemas.audience }),
	updateAudience
)
router.post(
	'/',
	signatureCheck,
	// celebrate({ body: schemas.audience }),
	postAudience
)

// TODO: schemas

function getByOwnerQuery(creator) {
	return {
		owner: { $in: [creator.toLowerCase(), getAddress(creator)] },
	}
}

async function getAudiencesByOwner(req, res) {
	try {
		const identity = req.identity
		const audiencesCol = db.getMongo().collection('audience')

		const audiences =
			(await audiencesCol
				.find(getByOwnerQuery(identity), { projection: { _id: 0 } })
				.toArray()) || []

		return res.json({ audiences })
	} catch (err) {
		console.error('Error getting audiences by owner', err)
		return res.status(500).send(err.toString())
	}
}

async function getAudience(req, res) {
	try {
		const campaignId = req.params.campaignId
		const audiencesCol = db.getMongo().collection('audience')
		const audience = await audiencesCol.findOne(
			{ campaignId },
			{ projection: { _id: 0 } }
		)

		if (!audience) {
			res.status(404).send('Audience not found')
		}

		return res.send({ audience })
	} catch (err) {
		console.error('Error getting audience', err)
		return res.status(500).send(err.toString())
	}
}

function updateAudience(req, res) {
	const campaignId = req.params.campaignId
	const audiencesCol = db.getMongo().collection('audience')
	const audience = req.body
	audience.updated = new Date()

	return audiencesCol.findOneAndUpdate(
		{ campaignId },
		{
			$set: audience,
		},
		{ returnOriginal: false },
		(err, result) => {
			if (err) {
				console.error('Error updating audience', err)
				return res.status(500).send(err.toString())
			}
			return res.status(200).send({ audience: result.value })
		}
	)
}

async function postAudience(req, res) {
	try {
		const identity = req.identity
		const audience = req.body
		audience.owner = identity
		audience.created = new Date()
		const audiencesCol = db.getMongo().collection('audience')

		await audiencesCol.insertOne(audience)

		return res.send(audience)
	} catch (err) {
		console.error('Error adding audience', err)
		return res.status(500).send(err.toString())
	}
}

module.exports = router
