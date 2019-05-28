const BN = require('bn.js')
const Uniprice = require('uniprice')
const provider = require('../helpers/web3/ethers').provider
const db = require('../db')
const getRequest = require('../helpers/getRequest')
const cfg = require('../cfg')
const updateCampaign = require('./updateCampaign')
const ethersUtils = require('../helpers/web3/ethers').ethers.utils
const {
	isInitializing,
	isOffline,
	isDisconnected,
	isInvalid,
	isUnhealthy,
	isReady,
	isActive,
	isExhausted,
	isExpired,
	isWithdraw
} = require('../lib/getStatus')

function getStatus (messagesFromAll, campaign, balanceTree) {
	if (isExpired(campaign)) {
		return 'Expired'
	} else if (isWithdraw(campaign)) {
		return 'Withdraw'
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

function getStatusOfCampaign (campaign) {
	const validators = campaign.spec.validators

	const leaderHb = getRequest(`${validators[0].url}/channel/${campaign.id}/validator-messages/${validators[0].id}/Heartbeat?limit=15`)
	const followerHb = getRequest(`${validators[1].url}/channel/${campaign.id}/validator-messages/${validators[0].id}/Heartbeat?limit=15`)
	const followerHbFromLeader = getRequest(`${validators[0].url}/channel/${campaign.id}/validator-messages/${validators[1].id}/Heartbeat?limit=15`)
	const followerHbFromFollower = getRequest(`${validators[1].url}/channel/${campaign.id}/validator-messages/${validators[1].id}/Heartbeat?limit=15`)
	const lastApproved = getRequest(`${validators[0].url}/channel/${campaign.id}/last-approved`)
	const treePromise = getRequest(`${validators[0].url}/channel/${campaign.id}/validator-messages/${validators[0].id}/Accounting`)

	return Promise.all([leaderHb, followerHb, followerHbFromLeader, followerHbFromFollower, lastApproved, treePromise])
		.then(([leaderHbResp, followerHbResp, followerHbFromLeaderResp, followerHbFromFollowerResp, lastApprovedResp, treeResp]) => {
			const lastApproved = lastApprovedResp.lastApproved
			const messagesFromAll = {
				leaderHeartbeat: leaderHbResp.validatorMessages,
				followerHeartbeat: followerHbResp.validatorMessages,
				followerFromLeader: followerHbFromLeaderResp.validatorMessages,
				followerFromFollower: followerHbFromFollowerResp.validatorMessages,
				newStateLeader: lastApproved ? [lastApproved.newState.msg] : [],
				approveStateFollower: lastApproved ? [lastApproved.approveState.msg] : []
			}
			const balanceTree = treeResp.validatorMessages[0] ? treeResp.validatorMessages[0].msg.balances : {}
			return {
				status: getStatus(messagesFromAll, campaign, balanceTree),
				lastHeartbeat: {
					leader: getLasHeartbeatTimestamp(messagesFromAll.leaderHeartbeat[0]),
					follower: getLasHeartbeatTimestamp(messagesFromAll.followerFromFollower[0])
				},
				lastApproved
			}
		})
}

function getLasHeartbeatTimestamp (msg) {
	if (msg && msg.msg) {
		return msg.msg.timestamp
	} else {
		return null
	}
}

async function verifyMessage (lastApproved) {
	const { newState, approveState } = lastApproved
	if (!lastApproved) {
		return null
	}
	const newStateAddr = ethersUtils.verifyMessage(JSON.stringify(newState.msg), newState.msg.signature)
	const approveStateAddr = ethersUtils.verifyMessage(JSON.stringify(approveState.msg), approveState.msg.signature)
	console.log(newStateAddr, approveStateAddr)
	return null
}

async function getDistributedFunds (campaign) {
	const validators = campaign.spec.validators

	const tree = await getRequest(`${validators[0].url}/channel/${campaign.id}/validator-messages/${validators[0].id}/Accounting`)
	const balanceTree = tree.validatorMessages[0] ? tree.validatorMessages[0].msg.balances : {}
	const totalBalances = Object.values(balanceTree).reduce((total, val) => total.add(new BN(val)), new BN(0))
	const depositAmount = new BN(campaign.depositAmount)
	const distributedFundsRatio = totalBalances.muln(1000).div(depositAmount) // in promiles

	return +distributedFundsRatio.toString(10)
}

async function getEstimateInUsd (campaign) {
	const uniprice = new Uniprice(provider, null, null)
	const exchangeAddr = await uniprice.factory.getExchange(campaign.depositAsset)
	const swap = uniprice.setExchange('TO-USD', exchangeAddr)
	let price
	try {
		price = await swap.getPrice() // might throw contract not deployed error
	} catch (err) {
		return null
	}
	price = new BN(campaign.depositAmount, 10).muln(price).toNumber()
	return price
}

async function queryValidators () {
	const campaignsCol = db.getMongo().collection('campaigns')

	// const lists = хawait Promise.all(cfg.initialValidators.map(url => getRequest(`${url}/channel/list`)))
	const { channels } = await getRequest(`${cfg.initialValidators[0]}/channel/list`)
	await channels.map(c => campaignsCol.update({ _id: c.id }, { $setOnInsert: c }, { upsert: true }))

	const campaigns = await campaignsCol.find().toArray()

	await campaigns.map(c => getStatusOfCampaign(c)
		.then(async ({ status, lastHeartbeat, lastApproved }) => {
			await verifyMessage(lastApproved)
			const [
				fundsDistributedRatio,
				usdEstimate
			] = await Promise.all([
				getDistributedFunds(c),
				getEstimateInUsd(c)
			])
			const statusObj = {
				name: status,
				lastChecked: Date.now(),
				fundsDistributedRatio,
				lastHeartbeat,
				usdEstimate
			}

			return updateCampaign(c, statusObj, lastApproved)
				.then(() => console.log(`Status of campaign ${c._id} updated`))
		}))
}

function startStatusLoop () {
	queryValidators()
	setInterval(queryValidators, cfg.statusLoopTick)
}

module.exports = startStatusLoop
