const express = require('express')
const db = require('../db')
const ipfs = require('../helpers/ipfs')

const router = express.Router()

router.get('/', getUnits)
router.get('/:id', getUnitById)
router.post('/', postUnit)

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

	return adUnitCol
		.findOne({ _id: id, owner: user })
		.then((result) => {
			res.send(result)
		})
}

function postUnit (req, res, next) {
	const { _meta, type, targetUrl, targeting, tags } = req.body
	const adUnitCol = db.getMongo().collection('adUnits')

	return ipfs.addFileToIpfs(JSON.stringify(_meta))
		.then((ipfsHash) => {
			const adUnit = { type, mediaurl: ipfsHash, targetUrl, targeting, tags, owner: req.user }
			return adUnitCol.insertOne(adUnit, (err, res) => {
				if (err) {
					console.error(new Error('error adding adUnit', err))
					return Promise.reject(err)
				}
				return Promise.resolve(res)
			})
		})
}

module.exports = router
