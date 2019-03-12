const express = require('express')
const db = require('../db')
const { adUnitValidator } = require('../helpers/validators')
const ObjectId = require('mongodb').ObjectId

const router = express.Router()

router.get('/', getUnits)
router.get('/:id', getUnitById)
router.post('/', adUnitValidator, postUnit)

function getUnits (req, res, next) {
	const user = req.user
	const limit = +req.query.limit || 100
	const skip = +req.query.skip || 0
	const adUnitCol = db.getMongo().collection('adUnits')

	return adUnitCol
		.find({ owner: user })
		.skip(skip)
		.limit(limit)
		.toArray()
		.then((result) => {
			res.send(result)
		})
}

function getUnitById (req, res, next) {
	const user = req.user
	const adUnitCol = db.getMongo().collection('adUnits')
	const id = req.params['id']
	console.log('ID', id)
	return adUnitCol
		.findOne({ _id: ObjectId(id), owner: req.user })
		.then((result) => {
			res.send(result)
		})
}

function postUnit (req, res, next) {
	const { type, mediaUrl, targetUrl, targeting, tags } = req.body
	const adUnitCol = db.getMongo().collection('adUnits')
	const adUnit = { type, mediaUrl, targetUrl, targeting, tags, owner: req.user }
	return adUnitCol.insertOne(adUnit, (err, result) => {
		if (err) {
			console.error(new Error('error adding adUnit', err))
			return res.status(403).send()
		}
		return res.status(200).send(adUnit)
	})
}

module.exports = router
