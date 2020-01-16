const express = require('express')
const db = require('../db')
const signatureCheck = require('../helpers/signatureCheck')
const { noCache } = require('../helpers/cache')
const { limitCampaigns } = require('../helpers/enforcePublisherLimits')
const { filterCampaignsForPublisher } = require('../helpers/campaignLimiting')
const { schemas, Campaign } = require('adex-models')
const { celebrate } = require('celebrate')
const { getAddress } = require('ethers/utils')
const router = express.Router()

const MAX_LIMIT = 500

router.get('/', limitCampaigns, getCampaigns)
router.get('/by-owner', noCache, signatureCheck, getCampaignsByOwner)
router.get('/:id', getCampaignInfo)
router.put('/:id/close', signatureCheck, closeCampaign)
router.put(
	'/:id',
	signatureCheck,
	celebrate({ body: schemas.campaignPut }),
	updateCampaign
)

function getByCreatorQuery(creator) {
	return {
		$or: [
			{ creator: creator },
			{ creator: creator.toLowerCase() },
			{ creator: getAddress(creator) },
		],
	}
}

function getFindQuery(query) {
	// Uses default statuses (active, ready) if none are requested
	const status = query.status ? query.status.split(',') : ['Active', 'Ready']
	// If request query has ?all it doesn't query for status
	let findQuery = query.hasOwnProperty('all')
		? {}
		: { 'status.name': { $in: status } }

	if (query.hasOwnProperty('depositAsset')) {
		findQuery['depositAsset'] = query.depositAsset
	}

	if (query.hasOwnProperty('byCreator')) {
		findQuery = { ...findQuery, ...getByCreatorQuery(query.byCreator) }
	}

	if (query.hasOwnProperty('byEarner')) {
		const queryString = `status.lastApprovedBalances.${query.byEarner}`
		findQuery[queryString] = { $exists: true, $ne: null }
	}
	return findQuery
}

function getCampaigns(req, res) {
	const campaignLimit = +req.query.limit || MAX_LIMIT
	const publisherChannelLimit = req.query.publisherChannelLimit
	const skip = +req.query.skip || 0
	const mongoQuery = getFindQuery(req.query)
	const campaignsCol = db.getMongo().collection('campaigns')
	campaignsCol
		.find(mongoQuery, { projection: { _id: 0 } })
		.skip(skip)
		.limit(campaignLimit)
		.toArray()
		.then(async campaigns => {
			if (req.query.hasOwnProperty('limitForPublisher')) {
				campaigns = await filterCampaignsForPublisher(
					campaigns,
					publisherChannelLimit,
					req.query,
					mongoQuery
				)
			}
			res.set('Cache-Control', 'public, max-age=60')
			return res.send(campaigns)
		})
		.catch(err => {
			console.error('Error getting campaigns', err)
			return res.status(500).send(err.toString())
		})
}

async function getCampaignsByOwner(req, res, next) {
	try {
		const identity = req.identity
		const campaignsCol = db.getMongo().collection('campaigns')

		const campaigns =
			(await campaignsCol
				.find(getByCreatorQuery(identity), { projection: { _id: 0 } })
				.toArray()) || []

		return res.json(campaigns)
	} catch (err) {
		console.error('Error getting campaign by owner', err)
		return res.status(500).send(err.toString())
	}
}

function getCampaignInfo(req, res) {
	const id = req.params.id
	const campaignsCol = db.getMongo().collection('campaigns')
	campaignsCol
		.findOne({ id: id })
		.then(campaign => {
			if (campaign && campaign.status && campaign.status.lastApprovedBalances) {
				return res.send({ balanceTree: campaign.status.lastApprovedBalances })
			}
			return res.send({})
		})
		.catch(err => {
			console.error('Error getting campaign info', err)
			return res.status(500).send(err.toString())
		})
}

async function closeCampaign(req, res) {
	try {
		const id = req.params.id
		const campaigns = db.getMongo().collection('campaigns')
		const updatedCampaign = await campaigns.findOneAndUpdate(
			{ id },
			{ $set: { 'status.humanFriendlyName': 'Closed' } },
			{ returnOriginal: false }
		)
		return res.send({ updatedCampaign })
	} catch (err) {
		console.error('Error updating campaign status', err)
		return res.status(500).send(err.toString())
	}
}

function updateCampaign(req, res) {
	const id = req.params.id
	const campaign = new Campaign(req.body)
	const campaignsCol = db.getMongo().collection('campaigns')

	return campaignsCol.findOneAndUpdate(
		{ id },
		{
			$set: campaign.marketDbUpdate,
		},
		{ returnOriginal: false },
		(err, result) => {
			if (err) {
				console.error('Error updating campaign', err)
				return res.status(500).send(err.toString())
			}
			return res.status(200).send({ campaign: result.value })
		}
	)
}

module.exports = router
