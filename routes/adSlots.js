const express = require('express')
const db = require('../db')
const { adSlotValidator } = require('../helpers/validators')

const router = express.Router()

router.get('/', getAdSlots)
router.get('/:id', getAdSlotById)
router.post('/', adSlotValidator, postAdSlot)

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
	const id = req.params['id']
	const adSlotsCol = db.getMongo().collection('adSlots')

	return adSlotsCol
		.findOne({ _id: id, owner: identity })
		.then((result) => {
			res.send([result])
		})
}

function postAdSlot (req, res, next) {
	const { type, fallbackMediaUrl, fallbackTargetUrl, tags } = req.body
	const identity = req.identity
	const adSlotsCol = db.getMongo().collection('adSlots')
	const adSlot = { type, fallbackTargetUrl, tags, fallbackMediaUrl, owner: identity }

	return adSlotsCol.insertOne(adSlot, (err, result) => {
		if (err) {
			console.error(new Error('Error adding adSlot', err))
			return res.status(420).send()
		}
		return res.send(adSlot)
	})
}

module.exports = router
