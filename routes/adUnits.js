const express = require('express')
const db = require('../db')
const { adUnitValidator } = require('../helpers/validators')
const addDataToIpfs = require('../helpers/ipfs')

const router = express.Router()

router.get('/', getUnits)
router.get('/:id', getUnitById)
router.post('/', adUnitValidator, postUnit)

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
	const { type, mediaUrl, mediaMime, targetUrl, targeting, tags, created, title, description, archived } = req.body
	const identity = req.identity

	const specForIpfs = JSON.stringify({ type, mediaUrl, mediaMime, targetUrl, targeting, tags, owner: identity, created })
	const adUnitCol = db.getMongo().collection('adUnits')
	const adUnit = { title, description, archived }
	return addDataToIpfs(specForIpfs)
		.then((dataHash) => {
			adUnit['ipfs'] = dataHash
			adUnit['modified'] = Date.now()

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
