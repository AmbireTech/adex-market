const express = require('express')
const db = require('../db')
const ipfs = require('../helpers/ipfs')

const router = express.Router()

router.get('/', getAdSlots)
router.get('/:id', getAdSlotById)
router.post('/', postAdSlot)

function getAdSlots (req, res, next) {
	const user = req.user
	const limit = +req.query.limit || 100
	const skip = +req.query.skip || 0
	const adSlotsCol = db.getMongo().collection('adSlots')

	return adSlotsCol
		.find({ owner: user })
		.skip(skip)
		.limit(limit)
		.toArray()
		.then((result) => {
			res.send(result)
		})
}

function getAdSlotById (req, res, next) {
	const user = req.user
	const id = req.params['id']
	const adSlotsCol = db.getMongo().collection('adSlots')

	return adSlotsCol
		.findOne({ _id: id, owner: user })
		.then((res) => {
			res.send(res)
		})
}

function postAdSlot (req, res, next) {
	const { _meta, type, fallbackTargetUrl, tags } = req.body
	const user = req.user
	const adSlotsCol = db.getMongo().collection('adSlots')

	return ipfs.addFileToIpfs(_meta)
		.then((ipfsHash) => {
			const adSlot = { type, fallbackTargetUrl, tags, fallbackMediaUrl: ipfsHash, owner: user }

			return adSlotsCol.insertOne(adSlot, (err, res) => {
				if (err) {
					console.error(new Error('Error adding adSlot', err))
					return Promise.reject(err)
				}
				return Promise.resolve(res)
			})
		})
}

module.exports = router
