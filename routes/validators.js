const express = require('express')
const db = require('../db')

const router = express.Router()

router.get('/', getValidators)
router.post('/', postValidator)

function getValidators (req, res) {
	const validatorsCol = db.getMongo().collection('validators')
	const { status, addr } = req.query

	const query = status ? { 'status': status } : addr ? { 'addr': addr } : {}

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

function postValidator (req, res) {
	const validatorsCol = db.getMongo().collection('validators')
	const validator = req.body

	return validatorsCol.insertOne(validator, (err, result) => {
		if (err) {
			console.error('Err adding validator!', err)
			return res.status(500).send(err)
		}
		return res.send(validator)
	})
}

module.exports = router
