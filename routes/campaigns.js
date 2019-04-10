const express = require('express')
const db = require('../db')
const getRequest = require('../helpers/getRequest')

const router = express.Router()

router.get('/', getCampaigns)
router.get('/:id', getCampaignInfo)

function getBalanceTree (validatorUrl, channelId) {
	return getRequest(`${validatorUrl}/channel/${channelId}/tree`)
		.then((res) => {
			return res
		})
		.catch((err) => {
			return err
		})
}

function getCampaigns (req, res, next) {
	const limit = +req.query.limit || 100
	const skip = +req.query.skip || 0
	const status = req.query.status ? req.query.status.split(',') : ['Active', 'Ready']

	const campaignsCol = db.getMongo().collection('campaigns')

	return campaignsCol
		.find({ 'status.name': { $in: status } })
		.skip(skip)
		.limit(limit)
		.toArray()
		.then((result) => {
			return res.send(result)
		})
		.catch((err) => {
			return res.status(500).send(err)
		})
}

function getCampaignInfo (req, res, next) {
	const id = req.params.id
	const campaignsCol = db.getMongo().collection('campaigns')

	return campaignsCol
		.find({ '_id': id })
		.toArray()
		.then((result) => {
			if (!result[0]) {
				return res.send([{}])
			}
			const validators = result[0].spec.validators
			const leaderBalanceTree = getBalanceTree(validators[0].url, id)
			const followerBalanceTree = getBalanceTree(validators[1].url, id)

			Promise.all([leaderBalanceTree, followerBalanceTree])
				.then((trees) => {
					return res.send([{ leaderBalanceTree: trees[0], followerBalanceTree: trees[1] }])
				})
		})
		.catch((err) => {
			return res.status(500).send(err)
		})
}

module.exports = router
