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
router.get('/with-targeting', limitCampaigns, getCampaignsWithTargeting)
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
		creator: { $in: [creator.toLowerCase(), getAddress(creator)] },
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
		const cond = { $exists: true, $ne: null }
		findQuery = {
			...findQuery,
			$or: [
				{
					[`status.lastApprovedBalances.${query.byEarner.toLowerCase()}`]: cond,
				},
				{ [`status.lastApprovedBalances.${getAddress(query.byEarner)}`]: cond },
			],
		}
	}
	return findQuery
}

async function getCampaignsFromQuery(query) {
	const campaignLimit = +query.limit || MAX_LIMIT
	const publisherChannelLimit = query.publisherChannelLimit
	const skip = +query.skip || 0
	const mongoQuery = getFindQuery(query)
	const campaignsCol = db.getMongo().collection('campaigns')
	const campaigns = await campaignsCol
		.find(mongoQuery, { projection: { _id: 0 } })
		.skip(skip)
		.limit(campaignLimit)
		.toArray()

	if (query.hasOwnProperty('limitForPublisher')) {
		return await filterCampaignsForPublisher(
			campaigns,
			publisherChannelLimit,
			query,
			mongoQuery
		)
	}

	return campaigns
}

async function getCampaigns(req, res) {
	try {
		const campaigns = await getCampaignsFromQuery(req.query)
		res.set('Cache-Control', 'public, max-age=60')
		return res.send(campaigns)
	} catch (e) {
		console.error('Error getting campaigns', err)
		return res.status(500).send(err.toString())
	}
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

async function getCampaignsWithTargeting(req, res) {
	try {
		const campaigns = await getCampaignsFromQuery(req.query)
		const country = req.headers['cf-ipcountry']
		const targeting = country ? [`location_${country.toUpperCase()}`] : []
		res.set('Cache-Control', 'public, max-age=60')
		return res.send({ campaigns, targeting })
	} catch (e) {
		console.error('Error getting campaigns', err)
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
