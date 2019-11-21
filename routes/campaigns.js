const express = require('express')
const db = require('../db')
const signatureCheck = require('../helpers/signatureCheck')
const { noCache } = require('../helpers/cache')
const { limitCampaigns } = require('../helpers/enforcePublisherLimits')
const { filterCampaignsForPublisher } = require('../helpers/campaignLimiting')
const router = express.Router()

const MAX_LIMIT = 300

router.get('/', limitCampaigns, getCampaigns)
router.get('/by-owner', noCache, signatureCheck, getCampaignsByOwner)
router.get('/:id', getCampaignInfo)

function getBalanceTree (channelId) {
	return db.getMongo().collection('campaigns')
		.find({ 'id': channelId })
		.toArray()
		.then(campaign => {
			if (campaign[0].status && campaign[0].status.lastApprovedBalances) {
				return campaign[0].status.lastApprovedBalances
			}
			return {}
		})
		.catch((err) => console.error(err))
}

function getFindQuery (query) {
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

	if (query.hasOwnProperty('limitForPublisher')) {
		const queryClause = `status.lastApprovedBalances.${query.limitForPublisher}`
		findQuery[queryClause] = { '$exists': true }
	}

	return findQuery
}

function getCampaigns (req, res) {
	const campaignLimit = +req.query.limit || MAX_LIMIT
	const publisherChannelLimit = req.query.publisherChannelLimit
	const skip = +req.query.skip || 0
	const mongoQuery = getFindQuery(req.query)
	const campaignsCol = db.getMongo().collection('campaigns')
	campaignsCol
		.find(
			mongoQuery,
			{ projection: { _id: 0 } }
		)
		.skip(skip)
		.limit(campaignLimit)
		.toArray()
		.then((campaigns) => {
			if (req.query.hasOwnProperty('limitForPublisher')) {
				campaigns = filterCampaignsForPublisher(campaigns, publisherChannelLimit, req.query.limitForPublisher)
			}
			res.set('Cache-Control', 'public, max-age=60')
			return res.send(campaigns)
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
		.find({ 'id': id },
			{ projection: { _id: 0 } }
		)
		.toArray()
		.then((result) => {
			if (!result[0]) {
				return res.send([{}])
			}
			return getBalanceTree(id)
				.then((balanceTree) => {
					return res.send([{ balanceTree }])
				})
		})
		.catch((err) => {
			console.error('Error getting campaign info', err)
			return res.status(500).send(err.toString())
		})
}

module.exports = router
