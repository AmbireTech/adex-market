const express = require('express')
const db = require('../db')
const addDataToIpfs = require('../helpers/ipfs')

const { celebrate } = require('celebrate')
const { schemas } = require('adex-models')

const router = express.Router()

router.get('/', getAdSlots)
router.get('/:id', getAdSlotById)
router.put('/:id', celebrate({ body: schemas.adSlotPut }), putAdSlot)
router.post('/', celebrate({ body: schemas.adSlotPost }), postAdSlot)

function getAdSlots (req, res) {
	const identity = req.identity
	const limit = +req.query.limit || 100
	const skip = +req.query.skip || 0
	const adSlotsCol = db.getMongo().collection('adSlots')

	return adSlotsCol
		.find(
			{ owner: identity },
			{ projection: { _id: 0 } }
		)
		.skip(skip)
		.limit(limit)
		.toArray()
		.then((result) => {
			return res.send(result)
		})
		.catch((err) => {
			console.error('Error getting ad slots', err)
			return res.status(500).send(err)
		})
}

function getAdSlotById (req, res) {
	const identity = req.identity
	const ipfs = req.params['id']
	const adSlotsCol = db.getMongo().collection('adSlots')

	return adSlotsCol
		.findOne(
			{ ipfs, owner: identity },
			{ projection: { _id: 0 } }
		)
		.then((result) => {
			if (!result) {
				return res.status(404).send('Ad Slot not found') // TODO? replace with code to add to translations
			}
			return res.send([result])
		})
		.catch(err => {
			console.error('Error getting slot by id', err)
			res.status(500).send(err)
		})
}

function postAdSlot (req, res) {
	const { type, tags, created, title, description, fallbackMediaUrl, fallbackMediaMime, fallbackTargetUrl, archived = false, modified = null } = req.body
	const identity = req.identity
	const specForIpfs = { type, tags, owner: identity, created }

	const adSlotsCol = db.getMongo().collection('adSlots')
	const adSlot = { type, tags, owner: identity, created, title, description, fallbackMediaMime, fallbackMediaUrl, fallbackTargetUrl, archived, modified }

	return addDataToIpfs(Buffer.from(JSON.stringify(specForIpfs)))
		.then((dataHash) => {
			adSlot['ipfs'] = dataHash

			return adSlotsCol.insertOne(adSlot, (err, result) => {
				if (err) {
					console.error('Error adding adSlot', err)
					return res.status(500).send(err)
				}
				return res.send(adSlot)
			})
		})
}

function putAdSlot (req, res) {
	const { title, description, fallbackMediaUrl, fallbackMediaMime, fallbackTargetUrl, archived, modified } = req.body
	const adSlotsCol = db.getMongo().collection('adSlots')
	const ipfs = req.params.id
	return adSlotsCol
		.findOneAndUpdate(
			{ ipfs },
			{
				'$set': {
					title,
					description,
					archived,
					fallbackMediaUrl,
					fallbackMediaMime,
					fallbackTargetUrl,
					modified
				}
			}, { returnOriginal: false },
			(err, result) => {
				if (err) {
					console.error('Error updating slot', err)
					return res.status(500).send(err)
				}
				return res.status(200).send(result)
			})
}

module.exports = router
