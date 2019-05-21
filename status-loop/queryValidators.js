const BN = require('bn.js')
const Uniprice = require('uniprice')
const provider = require('../helpers/web3/ethers').provider
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

	const leaderHeartbeat = getRequest(`${validators[0].url}/channel/${campaign.id}/validator-messages/${validators[0].id}/Heartbeat?limit=15`)
	const followerHeartbeat = getRequest(`${validators[1].url}/channel/${campaign.id}/validator-messages/${validators[0].id}/Heartbeat?limit=15`)
	const lastApproved = getRequest(`${validators[0].url}/channel/${campaign.id}/last-approved`)
	const treePromise = getRequest(`${validators[0].url}/channel/${campaign.id}/validator-messages/${validators[0].id}/Accounting`)

	return Promise.all([leaderHeartbeat, followerHeartbeat, lastApproved, treePromise])
		.then(([leaderHbResp, followerHbResp, lastApprovedResp, treeResp]) => {
			const lastApproved = lastApprovedResp.lastApproved
			const messagesFromAll = {
				leaderHeartbeat: leaderHbResp.validatorMessages.map(x => x.msg),
				followerHeartbeat: followerHbResp.validatorMessages.map(x => x.msg),
				newStateLeader: lastApproved ? [lastApproved.newState.msg] : [],
				approveStateFollower: lastApproved ? [lastApproved.approveState.msg] : []
			}
			const balanceTree = treeResp.validatorMessages[0] ? treeResp.validatorMessages[0].msg.balances : {}
			return {
				status: getStatus(messagesFromAll, campaign, balanceTree),
				lastHeartbeats: messagesFromAll.leaderHeartbeat.concat(messagesFromAll.followerHeartbeat)
			}
		})
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
	const factoryAddress = process.env.FACTORY_ADDR || null // will call default
	const daiExchangeAddress = process.env.DAI_EXCHANGE_ADDR || null

	const uniprice = new Uniprice(provider, factoryAddress, daiExchangeAddress)
	const exchangeAddr = await uniprice.factory.getExchange(campaign.depositAsset)
	const swap = uniprice.setExchange('TO-USD', exchangeAddr)
	let price
	try {
		price = await swap.getPrice() // might throw contract not deployed error
	} catch (err) {
		return null
	}
	price = new BN(campaign.depositAmount, 10).muln(price).toString(10)
	return price
}

async function queryValidators () {
	const campaignsCol = db.getMongo().collection('campaigns')

	// const lists = хawait Promise.all(cfg.initialValidators.map(url => getRequest(`${url}/channel/list`)))
	const { channels } = await getRequest(`${cfg.initialValidators[0]}/channel/list`)
	await channels.map(c => campaignsCol.update({ _id: c.id }, { $setOnInsert: c }, { upsert: true }))

	const campaigns = await campaignsCol.find().toArray()

	await campaigns.map(c => getStatusOfCampaign(c)
		.then(async ({ status, lastHeartbeats }) => {
			const statusObj = { name: status, lastChecked: Date.now() }
			statusObj['fundsDistributedRatio'] = await getDistributedFunds(c)
			statusObj['lastHeartbeats'] = lastHeartbeats.map(h => h.timestamp)
			const usdEstimate = await getEstimateInUsd(c)
			if (usdEstimate) {
				statusObj['usdEstimate'] = usdEstimate
			}
			return updateStatus(c, statusObj)
				.then(() => console.log(`Status of campaign ${c._id} updated`))
		}))
}

function startStatusLoop () {
	queryValidators()
	setInterval(queryValidators, cfg.statusLoopTick)
}

module.exports = startStatusLoop
