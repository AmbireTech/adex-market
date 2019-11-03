const express = require('express')
const db = require('../db')
const getRequest = require('../helpers/getRequest')
const signatureCheck = require('../helpers/signatureCheck')
const { limitCampaigns } = require('../helpers/enforcePublisherLimits')
const router = express.Router()

const MAX_LIMIT = 300

router.get('/', limitCampaigns, getCampaigns)
router.get('/by-owner', signatureCheck, getCampaignsByOwner)
router.get('/:id', getCampaignInfo)

function getBalanceTree (validatorUrl, channelId) {
	return getRequest(`${validatorUrl}/channel/${channelId}/tree`)
		.catch((err) => {
			return err
		})
}

function getCampaignsQuery (query) {
	// Uses default statuses (active, ready) if none are requested
	const status = query.status ? query.status.split(',') : ['Active', 'Ready']
	// If request query has ?all it doesn't query for status
	const findQuery = query.hasOwnProperty('all')
		? { }
		: { 'status.name': { $in: status } }

	if (query.hasOwnProperty('depositAsset')) {
		findQuery['depositAsset'] = query.depositAsset
	}

	if (query.hasOwnProperty('byCreator')) {
		findQuery['creator'] = query.byCreator
	}

	if (query.hasOwnProperty('byEarner')) {
		const queryClause = `status.lastApprovedBalances.${query.byEarner}`
		findQuery[queryClause] = { '$exists': true }
	}

	return findQuery
}

function getCampaigns (req, res) {
	const limit = +req.query.limit || MAX_LIMIT
	const skip = +req.query.skip || 0
	const query = getCampaignsQuery(req.query)
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
			return res.status(500).send(err.toString())
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
		return res.status(500).send(err.toString())
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
			return res.status(500).send(err.toString())
		})
}

module.exports = router
