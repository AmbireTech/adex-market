const express = require('express')
const { celebrate } = require('celebrate')
const { schemas, AdSlot } = require('adex-models')
const { getAddress } = require('ethers/utils')

const db = require('../db')
const addDataToIpfs = require('../helpers/ipfs')
const signatureCheck = require('../helpers/signatureCheck')

const router = express.Router()

router.get('/', getAdSlots)
router.get('/:id', getAdSlotById)
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

function getAdSlots(req, res) {
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

	return adSlotsCol
		.find(query, { projection: { _id: 0 } })
		.skip(skip)
		.limit(limit)
		.toArray()
		.then(result => {
			return res.send(result)
		})
		.catch(err => {
			console.error('Error getting ad slots', err)
			return res.status(500).send(err.toString())
		})
}

function getAdSlotById(req, res) {
	const ipfs = req.params['id']
	const adSlotsCol = db.getMongo().collection('adSlots')

	return adSlotsCol
		.findOne({ ipfs }, { projection: { _id: 0 } })
		.then(result => {
			if (!result) {
				return res.status(404).send('Ad Slot not found') // TODO? replace with code to add to translations
			}
			res.set('Cache-Control', 'public, max-age=10000')
			return res.send({
				slot: result,
			})
		})
		.catch(err => {
			console.error('Error getting slot by id', err)
			return res.status(500).send(err.toString())
		})
}

function postAdSlot(req, res) {
	const identity = req.identity
	const adSlotsCol = db.getMongo().collection('adSlots')
	const adSlot = new AdSlot(req.body)
	adSlot.owner = identity
	return addDataToIpfs(Buffer.from(JSON.stringify(adSlot.spec))).then(
		dataHash => {
			adSlot['ipfs'] = dataHash

			return adSlotsCol.insertOne(adSlot.marketDbAdd, err => {
				if (err) {
					console.error('Error adding adSlot', err)
					return res.status(500).send(err.toString())
				}
				return res.send(adSlot)
			})
		}
	)
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

module.exports = router
