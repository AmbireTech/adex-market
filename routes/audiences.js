const express = require('express')
const db = require('../db')
const { noCache } = require('../helpers/cache')
// const { schemas } = require('adex-models')
// const { celebrate } = require('celebrate')
const { getAddress } = require('ethers/utils')
const { sha256 } = require('ethers').utils

const router = express.Router()

router.get('/', noCache, getAudiencesByOwner)
router.get('/:id', getAudience)
router.put(
	'/:id',
	// celebrate({ body: schemas.audience }),
	updateAudience
)
router.post(
	'/',
	// celebrate({ body: schemas.audience }),
	postAudience
)

// TODO: schemas

function getByOwnerQuery(owner) {
	return {
		owner: { $in: [owner.toLowerCase(), getAddress(owner)] },
	}
}

async function getAudiencesByOwner(req, res) {
	try {
		const identity = req.identity
		const audiencesCol = db.getMongo().collection('audiences')

		const audiences = await audiencesCol
			.find(getByOwnerQuery(identity), { projection: { _id: 0 } })
			.toArray()

		return res.json({ audiences })
	} catch (err) {
		console.error('Error getting audiences by owner', err)
		return res.status(500).send(err.toString())
	}
}

async function getAudience(req, res) {
	try {
		const { id } = req.params
		const audiencesCol = db.getMongo().collection('audiences')
		const audience = await audiencesCol.findOne(
			{ id },
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
	const { id } = req.params
	const audiencesCol = db.getMongo().collection('audiences')
	const audience = req.body
	audience.updated = new Date()

	return audiencesCol.findOneAndUpdate(
		{ id },
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
		const audience = req.body
		audience.owner = req.identity
		audience.created = new Date()
		audience.id = sha256(Buffer.from(JSON.stringify({ ...audience })))
		const audiencesCol = db.getMongo().collection('audiences')

		await audiencesCol.insertOne(audience)

		return res.send(audience)
	} catch (err) {
		console.error('Error adding audience', err)
		return res.status(500).send(err.toString())
	}
}

module.exports = router
