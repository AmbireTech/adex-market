const express = require('express')
const db = require('../db')
const getRequest = require('../helpers/getRequest')
const signatureCheck = require('../helpers/signatureCheck')

const router = express.Router()

router.get('/', getCampaigns)
router.get('/by-owner', signatureCheck, getCampaignsByOwner)
router.get('/:id', getCampaignInfo)
router.get('/by-earner/:addr', signatureCheck, getCampaignsByEarner)

function getBalanceTree (validatorUrl, channelId) {
	return getRequest(`${validatorUrl}/channel/${channelId}/tree`)
		.catch((err) => {
			return err
		})
}

function getCampaigns (req, res) {
	const limit = +req.query.limit || 100
	const skip = +req.query.skip || 0
	// Uses default statuses (active, ready) if none are requested
	const status = req.query.status ? req.query.status.split(',') : ['Active', 'Ready']

	// If request query has ?all it doesn't query for status
	const query = req.query.hasOwnProperty('all')
		? { }
		: { 'status.name': { $in: status } }

	const campaignsCol = db.getMongo().collection('campaigns')

	campaignsCol
		.find(
			query,
			{ projection: { _id: 0 } }
		)
		.skip(skip)
		.limit(limit)
		.toArray()
		.then((result) => {
			res.set('Cache-Control', 'public, max-age=60')
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

		return res.json(campaigns)
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

function getCampaignsByEarner (req, res) {
	const earnerAddr = req.params.addr
	const campaignsCol = db.getMongo().collection('campaigns')

	return campaignsCol
		.find(
			{ 'status.lastApprovedBalances': { '$exists': true } },
			{ projection: { 'status.lastApprovedBalances': 1 } }) // NOTE: Assuming _id and id are the same as they currently are from queryValidators.js
		.toArray()
		.then((campaigns) => {
			const campaignsWithAddr = campaigns.filter(c => c.status.lastApprovedBalances.hasOwnProperty(earnerAddr))
			const result = campaignsWithAddr.map((c) => {
				return { [c._id]: c.status.lastApprovedBalances[earnerAddr] }
			})
			return res.send(result)
		})
}

module.exports = router
