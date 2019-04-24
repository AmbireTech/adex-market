const express = require('express')
const db = require('../db')

const { celebrate } = require('celebrate')
const { schemas } = require('adex-models')

const router = express.Router()

router.post('/', celebrate({ body: schemas.user }), postUser)
router.get('/list', getUserList)

function postUser (req, res, next) {
	const usersCol = db.getMongo().collection('users')
	const user = req.body
	// Assuming user has properties:
	// role (to distinguish advertisers/publishers),
	// channels, withdrawn (so we can get hasInteracted)

	usersCol
		.insertOne(user)
		.then(() => res.send({ success: true }))
}

function getUserList (req, res, next) {
	const usersCol = db.getMongo().collection('users')
	const hasInteracted = req.query.hasInteracted

	let query = {}

	if (hasInteracted) {
		query = {
			$or: [
				{ 'channels': { $exists: true, $ne: null } },
				{ 'withdrawn': { $exists: true, $gt: 0 } }
			]
		}
	}

	usersCol
		.find(query)
		.toArray()
		.then((result) => {
			return res.send(result)
		})
		.catch((err) => {
			console.error('Error getting user list', err)
			return res.status(500).send(err)
		})
}

module.exports = router
