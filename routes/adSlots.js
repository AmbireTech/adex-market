const express = require('express')
const db = require('../db')
const addDataToIpfs = require('../helpers/ipfs')

const { celebrate } = require('celebrate')
const schemas = require('../helpers/schemas')

const router = express.Router()

router.get('/', getAdSlots)
router.get('/:id', getAdSlotById)
router.post('/', celebrate({ body: schemas.adSlotPost }), postAdSlot)

function getAdSlots (req, res, next) {
	const identity = req.identity
	const limit = +req.query.limit || 100
	const skip = +req.query.skip || 0
	const adSlotsCol = db.getMongo().collection('adSlots')

	return adSlotsCol
		.find({ owner: identity })
		.skip(skip)
		.limit(limit)
		.toArray()
		.then((result) => {
			res.send(result)
		})
}

function getAdSlotById (req, res, next) {
	const identity = req.identity
	const ipfs = req.params['id']
	const adSlotsCol = db.getMongo().collection('adSlots')

	return adSlotsCol
		.findOne({ ipfs, owner: identity })
		.then((result) => {
			res.send([result])
		})
}

function postAdSlot (req, res, next) {
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
					console.error(new Error('Error adding adSlot', err))
					return res.status(420).send()
				}
				return res.send(adSlot)
			})
		})
}

module.exports = router
