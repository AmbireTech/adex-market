const db = require('../db')
const getRequest = require('../helpers/getRequest')
const cfg = require('../cfg')
const updateStatus = require('./updateStatus')
const {
	isInitializing,
	isOffline,
	isDisconnected,
	isInvalid,
	isUnhealthy,
	isReady,
	isActive,
	isExhausted,
	isExpired
} = require('../lib/getStatus')

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
	} else if (isActive(messagesFromAll)) {
		return 'Active'
	} else if (isReady(messagesFromAll)) {
		return 'Ready'
	}
	throw new Error('internal error: no status detected; should never happen')
}

/*
// NOTE: currently working in master
function getStatusOfCampaign (campaign) {
	const validators = campaign.spec.validators

	const mapMsgs = ({ validatorMessages }) => validatorMessages.map(x => x.msg)
	const mergeMsgs = ([a, b]) => a.concat(b)
	// ensure we also get the latest NewState/ApproveState
	const leaderPromise = Promise.all([
		getRequest(`${validators[0].url}/channel/${campaign.id}/validator-messages`).then(mapMsgs),
		getRequest(`${validators[0].url}/channel/${campaign.id}/validator-messages/${validators[0].id}/NewState?limit=1`).then(mapMsgs)
	]).then(mergeMsgs)
	const followerPromise = Promise.all([
		getRequest(`${validators[1].url}/channel/${campaign.id}/validator-messages`).then(mapMsgs),
		getRequest(`${validators[1].url}/channel/${campaign.id}/validator-messages/${validators[1].id}/ApproveState?limit=1`).then(mapMsgs)
	]).then(mergeMsgs)
	const treePromise = getRequest(`${validators[0].url}/channel/${campaign.id}/validator-messages/${validators[0].id}/Accounting`)

	return Promise.all([leaderPromise, followerPromise, treePromise])
		.then(([fromLeader, fromFollower, treeResp]) => {
			const messagesFromAll = [fromLeader, fromFollower]
			const balanceTree = treeResp.validatorMessages[0] ? treeResp.validatorMessages[0].msg.balances : {}
			return getStatus(messagesFromAll, campaign, balanceTree)
		})
}
*/

// NOTE: Latest from Simo - need to check which one is ok
// tom and jerry in this requests does not look correct
function getStatusOfCampaign (campaign) {
	const validators = campaign.spec.validators

	const leaderHeartbeat = getRequest(`${validators[0].url}/channel/${campaign.id}/validator-messages?limit=10`)
	const followerHeartbeat = getRequest(`${validators[1].url}/channel/${campaign.id}/validator-messages?limit=10`)
	const newState = getRequest(`${validators[0].url}/channel/${campaign.id}/validator-messages/${validators[0].id}/NewState?limit=1`)
	const approveState = getRequest(`${validators[1].url}/channel/${campaign.id}/validator-messages/${validators[1].id}/ApproveState?limit=1`)
	const treePromise = getRequest(`${validators[0].url}/channel/${campaign.id}/validator-messages/${validators[0].id}/Accounting`)

	return Promise.all([leaderHeartbeat, followerHeartbeat, newState, approveState, treePromise])
		.then(([leaderHbResp, followerHbResp, newStateResp, approveStateResp, treeResp]) => {
			const messagesFromAll = {
				leaderHeartbeat: leaderHbResp.validatorMessages.map(x => x.msg).filter(x => x.type === 'Heartbeat'),
				followerHeartbeat: followerHbResp.validatorMessages.map(x => x.msg).filter(x => x.type === 'Heartbeat'),
				newStateLeader: newStateResp.validatorMessages.map(x => x.msg),
				approveStateFollower: approveStateResp.validatorMessages.map(x => x.msg)
			}
			const balanceTree = treeResp.validatorMessages[0] ? treeResp.validatorMessages[0].msg.balances : {}
			return getStatus(messagesFromAll, campaign, balanceTree)
		})
}

async function queryValidators () {
	const campaignsCol = db.getMongo().collection('campaigns')

	// const lists = хawait Promise.all(cfg.initialValidators.map(url => getRequest(`${url}/channel/list`)))
	const { channels } = await getRequest(`${cfg.initialValidators[0]}/channel/list`)
	await channels.map(c => campaignsCol.update({ _id: c.id }, { $setOnInsert: c }, { upsert: true }))

	const campaigns = await campaignsCol.find().toArray()
	await campaigns.map(c => getStatusOfCampaign(c)
		.then(status => {
			const statusObj = { name: status, lastChecked: Date.now() }
			console.log(c.id, status)
			return updateStatus(c, statusObj)
				.then(() => console.log(`Status of campaign ${c._id} updated`))
		}))
}

function startStatusLoop () {
	queryValidators()
	setInterval(queryValidators, cfg.statusLoopTick)
}

module.exports = startStatusLoop
