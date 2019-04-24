const express = require('express')
const db = require('../db')
const getRequest = require('../helpers/getRequest')

const router = express.Router()

router.get('/', getStats)

function getActiveUsers (users, role) {
	return users.filter((u) => u.role === role).length
}

function getAnonPublishers (campaigns, users) {
	const allUsersInCampaign = campaigns.map((c) => {
		getRequest(`${c.spec.validators[0].url}/channels/${c.id}/tree`)
			.then((result) => {
				return Object.keys(result.balances)
			})
	})

	return Promise.all(allUsersInCampaign)
		.then((allUsers) => {
			return allUsers.filter((u) => !users.includes(u))
		})
}

function getAnonAdvertisers (campaigns, users) {
	const creators = campaigns.reduce((all, c) => {
		all.push(c.creator)
		return all
	}, [])

	return creators.filter((c) => !users.includes(c))
}

function getData () {
	const usersCol = db.getMongo().collection('users')
	const campaignsCol = db.getMongo().collection('campaigns')

	const getDataFromUsers = usersCol
		.find()
		.toArray()
		.then((result) => {
			return result
		})

	const getDataFromCampaigns = campaignsCol
		.find()
		.toArray()
		.then((result) => {
			return result
		})

	return Promise.all([getDataFromUsers, getDataFromCampaigns])
}

function getStats (req, res, next) {
	const output = {
		publisherCount: 0,
		advertiserCount: 0,
		anonPublisherCount: 0,
		anonAdvertiserCount: 0,
		campaignCount: 0,
		campaignsByStatus: {},
		totalSpentFundsByAssetType: {}
	}

	getData()
		.then((result) => {
			const users = result[0]
			const campaigns = result[1]
			getAnonPublishers(campaigns, users)
				.then((anonPublishers) => {
					output.publisherCount = getActiveUsers(users, 'publisher')
					output.advertiserCount = getActiveUsers(users, 'advertiser')
					output.campaignCount = campaigns.length
					output.anonPublishers = anonPublishers
					output.anonAdvertisers = getAnonAdvertisers(campaigns, users)

					campaigns.map((c) => {
						if (!output.campaignsByStatus[c.status.name]) {
							output.campaignsByStatus[c.status.name] = 0
						}
						if (!output.totalSpentFundsByAssetType[c.depositAsset]) {
							output.totalSpentFundsByAssetType[c.depositAsset] = 0
						}

						output.totalSpentFundsByAssetType[c.depositAsset] += c.depositAmount
						output.campaignsByStatus[c.status.name]++
					})

					return res.send(output)
				})
				.catch((err) => {
					console.error('Error getting stats', err)
					return res.status(500).send(err)
				})
		})
}

module.exports = router
