const express = require('express')
const db = require('../db')
const getRequest = require('../helpers/getRequest')
const signatureCheck = require('../helpers/signatureCheck')

const router = express.Router()

router.get('/', getCampaigns)
router.get('/by-owner', signatureCheck, getCampaignsByOwner)
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

function getBalances (validatorUrl, channelId) {
	return getRequest(`${validatorUrl}/channel/${channelId}/last-approved`)
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

	campaignsCol
		.find(
			{ 'status.name': { $in: status } },
			{ projection: { _id: 0 } }
		)
		.skip(skip)
		.limit(limit)
		.toArray()
		.then((result) => {
			return res.send(result)
		})
		.catch((err) => {
			console.error('Error getting campaigns', err)
			return res.status(500).send(err)
		})
}

async function getCampaignsByOwner (req, res, next) {
	try {
		const identity = req.identity
		const campaignsCol = db.getMongo().collection('campaigns')

		const campaigns = await campaignsCol
			.find(
				{ 'creator': identity },
				{ projection: { _id: 0 } }
			)
			.toArray() || []

		const infos = campaigns.map(async (c) => {
			const validators = c.spec.validators
			const leaderBalanceTree = getBalances(validators[0].url, c.id)
			const followerBalanceTree = getBalances(validators[1].url, c.id)

			const [leaderBalances, followerBalances] = await Promise.all([leaderBalanceTree, followerBalanceTree])
			return { ...c, leaderBalances, followerBalances }
		})

		const result = await Promise.all(infos)

		return res.json(result)
	} catch (err) {
		console.error('Error getting campaign by owner', err)
		return res.status(500).send(err)
	}
}

function getCampaignInfo (req, res, next) {
	const id = req.params.id
	const campaignsCol = db.getMongo().collection('campaigns')

	campaignsCol
		.find({ '_id': id },
			{ projection: { _id: 0 } }
		)
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
			console.error('Error getting campaign info', err)
			return res.status(500).send(err)
		})
}

module.exports = router
