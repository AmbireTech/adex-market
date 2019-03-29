const db = require('../db')
const getRequest = require('../helpers/getRequest')
const cfg = require('../cfg')
const updateStatus = require('./updateStatus')
const { isInitializing, isOffline, isDisconnected, isInvalid, isUnhealthy, isReady, isActive, isExhausted, isExpired } = require('../lib/getStatus')

function getStatus (messagesFromAll, campaign, balanceTree) {
	if (isExpired(campaign)) {
		return 'Expired'
	} else if (isExhausted(campaign, balanceTree)) {
		return 'Exhausted'
	} else if (isInitializing(messagesFromAll)) {
		return 'Initializing'
	} else if (isOffline(messagesFromAll)) {
		return 'Offline'
	} else if (isDisconnected(messagesFromAll)) {
		return 'Disconnected'
	} else if (isInvalid(messagesFromAll)) {
		return 'Invalid'
	} else if (isUnhealthy(messagesFromAll)) {
		return 'Unhealthy'
	} else if (isReady(messagesFromAll)) {
		return 'Ready'
	} else if (isActive(messagesFromAll)) {
		return 'Active'
	}
	return 'No status detected'
}

function getValidatorMessagesOfCampaign (campaign) {
	const validators = campaign.spec.validators

	const leaderPromise = getRequest(`${validators[0].url}/channel/${validators[0].id}/validator-messages`)
	const followerPromise = getRequest(`${validators[1].url}/channel/${validators[1].id}/validator-messages`)
	const treePromise = getRequest(`${validators[0].url}/channel/${campaign.id}/tree`)

	return Promise.all([leaderPromise, followerPromise, treePromise])
		.then((result) => {
			const messagesFromAll = [result[0].validatorMessages, result[1].validatorMessages]
			const balanceTree = result[2].balances
			return getStatus(messagesFromAll, campaign, balanceTree)
		})
}

async function queryValidators () {
	const campaigns = await db.getMongo().collection('campaigns')
		.find()
		.toArray()

	await campaigns.map(c => getValidatorMessagesOfCampaign(c)
		.then(status => {
			const statusObj = { name: status, lastChecked: new Date().toISOString() }
			return updateStatus(c, statusObj)
				.then(() => console.log(`Status of campaign ${c._id} updated`))
		
		}))
}

function startStatusLoop () {
	queryValidators()
	setInterval(queryValidators, cfg.statusLoopTick)
}

module.exports = startStatusLoop
