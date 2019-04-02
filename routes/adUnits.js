const express = require('express')
const db = require('../db')
const addDataToIpfs = require('../helpers/ipfs')

const { celebrate } = require('celebrate')
const schemas = require('../helpers/schemas')

const router = express.Router()

router.get('/', getUnits)
router.get('/:id', getUnitById)
router.post('/', celebrate({ body: schemas.adUnitPost }), postUnit)

function getUnits (req, res, next) {
	const identity = req.identity
	const limit = +req.query.limit || 100
	const skip = +req.query.skip || 0
	const adUnitCol = db.getMongo().collection('adUnits')

	return adUnitCol
		.find({ owner: identity })
		.skip(skip)
		.limit(limit)
		.toArray()
		.then((result) => {
			res.send(result)
		})
}

function getUnitById (req, res, next) {
	const identity = req.identity
	const adUnitCol = db.getMongo().collection('adUnits')
	const id = req.params['id']
	return adUnitCol
		.findOne({ _id: id, owner: identity })
		.then((result) => {
			res.send([result])
		})
}

function postUnit (req, res, next) {
	const { type, mediaUrl, mediaMime, targetUrl, targeting, tags, created, title, description, archived = false, modified = null } = req.body
	const identity = req.identity

	const specForIpfs = { type, mediaUrl, mediaMime, targetUrl, targeting, tags, owner: identity, created }
	const adUnitCol = db.getMongo().collection('adUnits')
	const adUnit = { type, mediaUrl, mediaMime, targetUrl, targeting, tags, owner: identity, created, title, description, archived, modified }
	return addDataToIpfs(Buffer.from(JSON.stringify(specForIpfs)))
		.then((dataHash) => {
			adUnit['ipfs'] = dataHash

			return adUnitCol.insertOne(adUnit, (err, result) => {
				if (err) {
					console.error(new Error('error adding adUnit', err))
					return res.status(418).send()
				}
				return res.status(200).send(adUnit)
			})
		})
}

module.exports = router
