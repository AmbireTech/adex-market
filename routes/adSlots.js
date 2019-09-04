const express = require('express')
const { celebrate } = require('celebrate')
const { schemas, AdSlot } = require('adex-models')

const db = require('../db')
const addDataToIpfs = require('../helpers/ipfs')
const signatureCheck = require('../helpers/signatureCheck')

const router = express.Router()

router.get('/', getAdSlots)
router.get('/:id', getAdSlotById)
router.put('/:id', signatureCheck, celebrate({ body: schemas.adSlotPut }), putAdSlot)
router.post('/', signatureCheck, celebrate({ body: schemas.adSlotPost }), postAdSlot)

function getAdSlots (req, res) {
	const identity = req.query.identity
	const limit = +req.query.limit || 100
	const skip = +req.query.skip || 0
	const adSlotsCol = db.getMongo().collection('adSlots')

	const query = {}

	if (identity) {
		query['owner'] = identity
	}

	return adSlotsCol
		.find(
			query,
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
	const ipfs = req.params['id']
	const adSlotsCol = db.getMongo().collection('adSlots')

	return adSlotsCol
		.findOne(
			{ ipfs },
			{ projection: { _id: 0 } }
		)
		.then((result) => {
			if (!result) {
				return res.status(404).send('Ad Slot not found') // TODO? replace with code to add to translations
			}
			return res.send({
				slot: result
			})
		})
		.catch(err => {
			console.error('Error getting slot by id', err)
			res.status(500).send(err)
		})
}

function postAdSlot (req, res) {
	const identity = req.identity
	const adSlotsCol = db.getMongo().collection('adSlots')
	const adSlot = new AdSlot(req.body)
	adSlot.owner = identity

	return addDataToIpfs(Buffer.from(JSON.stringify(adSlot.spec)))
		.then((dataHash) => {
			adSlot['ipfs'] = dataHash

			return adSlotsCol.insertOne(adSlot.marketDbAdd, (err, result) => {
				if (err) {
					console.error('Error adding adSlot', err)
					return res.status(500).send(err)
				}
				return res.send(adSlot)
			})
		})
}

function putAdSlot (req, res) {
	const slot = {
		...req.body,
		modified: Date.now()
	}
	const adSlot = new AdSlot(slot)
	const adSlotsCol = db.getMongo().collection('adSlots')
	const ipfs = req.params.id
	return adSlotsCol
		.findOneAndUpdate(
			{ ipfs },
			{
				'$set': adSlot.marketDbUpdate
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
