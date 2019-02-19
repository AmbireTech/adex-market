const db = require('../db')
const getRequest = require('../helpers/getRequest')
const cfg = require('../cfg')
const { isInitializing, isOffline, isDisconnected, isInvalid, isUnhealthy, isReady, isActive, isExhausted, isExpired } = require('../lib/getStatus')

function getStatus (messages, campaign, balanceTree) {
	if (isExpired(campaign)) {
		return 'Expired'
	} else if (isExhausted(campaign, balanceTree)) {
		return 'Exhausted'
	} else if (isInitializing(messages)) {
		return 'Initializing'
	} else if (isOffline(messages)) {
		return 'Offline'
	} else if (isDisconnected(messages)) {
		return 'Disconnected'
	} else if (isInvalid(messages)) {
		return 'Invalid'
	} else if (isUnhealthy(messages)) {
		return 'Unhealthy'
	} else if (isReady(messages)) {
		return 'Ready'
	} else if (isActive(messages)) {
		return 'Active'
	}
	return 'No status detected'
}

function updateStatus (campaign, status) {
	const campaignCol = db.getMongo().collection('campaigns')

	return campaignCol.findOneAndUpdate(
		{ _id: campaign._id },
		{ $set:
      { status: status }
		})
}

function getValidatorMessagesOfCampaign (campaign) {
	const validators = campaign.spec.validators

	const leaderPromise = getRequest(`${validators[0].url}/channel/${validators[0].id}/validator-messages`)
	const followerPromise = getRequest(`${validators[1].url}/channel/${validators[1].id}/validator-messages`)
	const treePromise = getRequest(`${validators[0].url}/channel/${campaign.id}/tree`)

	return Promise.all([leaderPromise, followerPromise, treePromise])
		.then((result) => {
			const messages = [result[0].validatorMessages, result[1].validatorMessages]
			const balanceTree = result[2].balances
			return getStatus(messages, campaign, balanceTree)
		})
}

function queryValidators () {
	db.getMongo().collection('campaigns')
		.find()
		.toArray()
		.then((campaigns) => {
			campaigns.map((c) => {
				getValidatorMessagesOfCampaign(c)
					.then((status) => {
						const statusObj = { name: status, lastChecked: new Date().toISOString() }
						return updateStatus(c, statusObj)
							.then(() => console.log('Status updated'))
					})
			})
		})
}

function statusLoop () {
	queryValidators()
	setInterval(queryValidators, cfg.statusLoopTick)
}

module.exports = statusLoop
