const express = require('express')
const db = require('../db')
const addDataToIpfs = require('../helpers/ipfs')

const { celebrate } = require('celebrate')
const { schemas, AdUnit } = require('adex-models')

const router = express.Router()

router.get('/', getAdUnits)
router.get('/:id', getAdUnitById)
router.post('/', celebrate({ body: schemas.adUnitPost }), postAdUnit)
router.put('/:id', celebrate({ body: schemas.adUnitPut }), putAdUnit)

function getAdUnits (req, res) {
	const identity = req.identity
	const limit = +req.query.limit || 100
	const skip = +req.query.skip || 0
	const adUnitCol = db.getMongo().collection('adUnits')

	return adUnitCol
		.find({ owner: identity },
			{ projection: { _id: 0 } }
		)
		.skip(skip)
		.limit(limit)
		.toArray()
		.then((result) => {
			return res.send(result)
		})
		.catch((err) => {
			console.error('Error getting ad units', err)
			return res.status(500).send(err)
		})
}

function getAdUnitById (req, res) {
	const identity = req.identity
	const adUnitCol = db.getMongo().collection('adUnits')
	const ipfs = req.params['id']
	return adUnitCol
		.findOne({ ipfs, owner: identity },
			{ projection: { _id: 0 } })
		.then((result) => {
			if (!result) {
				return res.status(404).send('Ad Unit not found')
			}
			return res.send([result])
		})
		.catch((err) => {
			console.error('Error getting ad unit by id', err)
			return res.status(500).send(err)
		})
}

function postAdUnit (req, res) {
	const identity = req.identity
	const adUnit = new AdUnit(req.body)
	adUnit.owner = identity
	const adUnitCol = db.getMongo().collection('adUnits')
	return addDataToIpfs(Buffer.from(JSON.stringify(adUnit.spec)))
		.then((dataHash) => {
			adUnit['ipfs'] = dataHash
			return adUnitCol.insertOne(adUnit.marketDbAdd, (err, result) => {
				if (err) {
					console.error(new Error('error adding adUnit', err))
					return res.status(500).send(err)
				}
				return res.status(200).send(adUnit)
			})
		})
}

function putAdUnit (req, res) {
	const adUnit = new AdUnit(req.body)
	const adUnitCol = db.getMongo().collection('adUnits')
	const ipfs = req.params.id

	return adUnitCol
		.findOneAndUpdate({ ipfs }, {
			'$set': adUnit.marketDbUpdate
		}, { returnOriginal: false }, (err, result) => {
			if (err) {
				console.error('Error updating ad unit', err)
				return res.status(500).send(err)
			}
			return res.status(200).send(result)
		})
}

module.exports = router
