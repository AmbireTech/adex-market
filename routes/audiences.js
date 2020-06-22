const express = require('express')
const db = require('../db')
const { noCache } = require('../helpers/cache')
const { schemas, Audience } = require('adex-models')
const { celebrate } = require('celebrate')
const crypto = require('crypto')

const router = express.Router()

router.get('/', noCache, getAudiencesByOwner)
router.get('/:id', getAudience)
router.put('/:id', celebrate({ body: schemas.audiencePut }), updateAudience)
router.post('/', celebrate({ body: schemas.audiencePost }), postAudience)

async function getAudiencesByOwner(req, res) {
	try {
		const owner = req.identity
		const audiencesCol = db.getMongo().collection('audiences')

		const audiences = await audiencesCol
			.find({ owner }, { projection: { _id: 0 } })
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
	const audience = new Audience(req.body)
	audience.modified = new Date()

	return audiencesCol.findOneAndUpdate(
		{ id },
		{
			$set: audience.marketDbUpdate,
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

		const id = crypto
			.createHash('sha256')
			.update(JSON.stringify({ ...audience }))
			.digest('hex')

		audience.id = '0x' + id
		const audiencesCol = db.getMongo().collection('audiences')

		await audiencesCol.insertOne(audience)

		return res.send(audience)
	} catch (err) {
		console.error('Error adding audience', err)
		return res.status(500).send(err.toString())
	}
}

module.exports = router
