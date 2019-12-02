const { bigNumberify, formatUnits } = require('ethers').utils
const Uniprice = require('uniprice')
const { provider, getERC20Contract } = require('../helpers/web3/ethers')
const db = require('../db')
const getRequest = require('../helpers/getRequest')
const cfg = require('../cfg')
const updateCampaign = require('./updateCampaign')
const { verifyLastApproved } = require('./verifyMessages')
const getChannels = require('./getChannels')

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

const DAI_ADDRESS = '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359'
const DAI_USD_PRICE = 1
const DAI_DECIMALS = 18

function getStatus (messagesFromAll, campaign, balanceTree) {
	// Explaining the order
	// generally we want to check more specific states first: if one state can be a subset of another, we check it first
	if (isExpired(campaign)) {
		return 'Expired'
	} else if (isExhausted(campaign, balanceTree)) {
		return 'Exhausted'
	} else if (isWithdraw(campaign)) {
		return 'Withdraw'
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
		return (!campaign.spec.activeFrom || campaign.spec.activeFrom < Date.now()) ? 'Ready' : 'Waiting'
	}
	throw new Error('internal error: no status detected; should never happen')
}

function hbByValidator (validatorId, hb) {
	return hb.from === validatorId
}

async function getStatusOfCampaign (campaign) {
	const validators = campaign.spec.validators
	const leader = validators[0]
	const follower = validators[1]

	const callLeader = getRequest(`${leader.url}/channel/${campaign.id}/last-approved?withHeartbeat=true`)
	const callFollower = getRequest(`${follower.url}/channel/${campaign.id}/last-approved?withHeartbeat=true`)

	const [ dataLeader, dataFollower ] = await Promise.all([callLeader, callFollower])

	const lastApproved = dataLeader.lastApproved
	const leaderHeartbeats = dataLeader.heartbeats || []
	const followerHeartbeats = dataFollower.heartbeats || []
	const messagesFromAll = {
		leaderHeartbeat: leaderHeartbeats.filter(hbByValidator.bind(this, leader.id)),
		followerHeartbeat: followerHeartbeats.filter(hbByValidator.bind(this, leader.id)),
		followerFromLeader: leaderHeartbeats.filter(hbByValidator.bind(this, follower.id)),
		followerFromFollower: followerHeartbeats.filter(hbByValidator.bind(this, follower.id)),
		newStateLeader: lastApproved ? [lastApproved.newState] : [],
		approveStateFollower: lastApproved ? [lastApproved.approveState] : []
	}

	const verified = verifyLastApproved(lastApproved, validators)
	const lastApprovedSigs = lastApproved ? getLastSigs(lastApproved) : []
	const lastApprovedBalances = lastApproved ? getLastBalances(lastApproved) : {}
	return {
		name: getStatus(messagesFromAll, campaign, lastApprovedBalances),
		lastHeartbeat: {
			leader: getLasHeartbeatTimestamp(messagesFromAll.leaderHeartbeat[0]),
			follower: getLasHeartbeatTimestamp(messagesFromAll.followerFromFollower[0])
		},
		lastApprovedSigs,
		lastApprovedBalances,
		verified
	}
}

function getLastSigs (lastApproved) {
	return [lastApproved.newState.msg.signature, lastApproved.approveState.msg.signature]
}

function getLastBalances (lastApproved) {
	return lastApproved.newState.msg.balances
}

function getLasHeartbeatTimestamp (msg) {
	if (msg && msg.msg) {
		return msg.msg.timestamp
	} else {
		return null
	}
}

async function getDistributedFunds (campaign, balanceTree) {
	const totalBalances = Object.values(balanceTree).reduce((total, val) => total.add(bigNumberify(val)), bigNumberify(0))
	const depositAmount = bigNumberify(campaign.depositAmount)
	const distributedFundsRatio = totalBalances.mul(bigNumberify(1000)).div(depositAmount) // in promiles

	return +distributedFundsRatio.toString(10)
}

function getUsdAmount (wei, price, decimals) {
	const weiAmount = bigNumberify(wei)
		.mul(bigNumberify(price))
		.toString()

	const normalized = formatUnits(weiAmount, decimals)
	const amount = parseFloat(normalized)

	return amount
}

async function getEstimateInUsd (campaign) {
	const { depositAsset, depositAmount } = campaign

	if (depositAsset.toLowerCase() === DAI_ADDRESS.toLowerCase()) {
		return getUsdAmount(depositAmount, DAI_USD_PRICE, DAI_DECIMALS)
	}

	try {
		const uniprice = new Uniprice(provider)
		const exchangeAddr = await uniprice.factory.getExchange(depositAsset)
		const swap = uniprice.setExchange('TO-USD', exchangeAddr)
		const price = await swap.getPrice() // might throw contract not deployed error
		const decimals = await getERC20Contract(depositAsset).decimals()

		return getUsdAmount(depositAmount, price, decimals)
	} catch (err) {
		return null
	}
}

async function queryValidators () {
	const campaignsCol = db.getMongo().collection('campaigns')
	const channels = await getChannels()

	await channels.map(c => campaignsCol.updateOne({ _id: c.id }, { $setOnInsert: c }, { upsert: true }))

	// If a campaign is in Expired, there's no way the state would ever change after that: so no point to update it
	const campaigns = await campaignsCol
		.find({ 'status.name': { '$nin': ['Expired'] } }).toArray()

	await Promise.all(campaigns
		.map(c => getStatusOfCampaign(c)
			.then(async (status) => {
				const [
					fundsDistributedRatio,
					usdEstimate
				] = await Promise.all([
					getDistributedFunds(c, status.lastApprovedBalances),
					getEstimateInUsd(c)
				])
				const statusObj = {
					...status,
					lastChecked: Date.now(),
					fundsDistributedRatio,
					usdEstimate
				}

				if (status.verified) {
					return updateCampaign(c, statusObj)
						.then(() => console.log(`Status of campaign ${c._id} updated: ${status.name}`))
				}
				return Promise.resolve()
			})))
}

function startStatusLoop () {
	queryValidators()
	setInterval(queryValidators, cfg.statusLoopTick)
}

module.exports = { startStatusLoop, getEstimateInUsd }
