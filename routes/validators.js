const express = require('express')
const db = require('../db')

const router = express.Router()

router.get('/', getValidators)

function getValidators (req, res, next) {
	const validatorsCol = db.getMongo().collection('validators')
	const { status, addr } = req.query
	let query

	status ? query = { 'status': status } : addr ? query = { 'addr': addr } : query = {}

	return validatorsCol
		.find(query)
		.toArray()
		.then((result) => {
			return res.send(result)
		})
		.catch((err) => {
			console.error('Error getting validators', err)
			return res.status(500).send(err)
		})
}

module.exports = router
