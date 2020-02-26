const { bigNumberify, formatUnits } = require('ethers').utils
const db = require('../db')
const getRequest = require('../helpers/getRequest')
const cfg = require('../cfg')
const { verifyLastApproved } = require('./verifyMessages')
const getChannels = require('./getChannels')

const {
	isInitializing,
	isOffline,
	isDisconnected,
	isRejected,
	isInvalid,
	isUnhealthy,
	isReady,
	isActive,
	isExhausted,
	isExpired,
	isWithdraw,
} = require('../lib/getStatus')

const usdPriceMapping = {
	// SAI
	'0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359': [1.0, 18],
	// DAI
	'0x6b175474e89094c44da98b954eedeac495271d0f': [1.0, 18],
}

function getStatus(messagesFromAll, campaign, balanceTree) {
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
	} else if (isRejected(messagesFromAll)) {
		return 'Rejected'
	} else if (isInvalid(messagesFromAll)) {
		return 'Invalid'
	} else if (isUnhealthy(messagesFromAll)) {
		return 'Unhealthy'
	} else if (isActive(messagesFromAll)) {
		return 'Active'
	} else if (isReady(messagesFromAll)) {
		return !campaign.spec.activeFrom || campaign.spec.activeFrom < Date.now()
			? 'Ready'
			: 'Waiting'
	}

	throw new Error('internal error: no status detected; should never happen')
}

function getHumanFriendlyName(status, campaign) {
	if (campaign.status && campaign.status.humanFriendlyName === 'Closed')
		return 'Closed'
	switch (status) {
		case 'Active':
		case 'Ready':
		case 'Pending':
		case 'Initializing':
		case 'Waiting':
		case 'Offline':
		case 'Disconnected':
		case 'Unhealthy':
		case 'Rejected':
		case 'Invalid':
			return 'Active'
		case 'Expired':
		case 'Exhausted':
		case 'Withdraw':
			return 'Completed'
		default:
			return 'N/A'
	}
}

function hbByValidator(validatorId, hb) {
	return hb.from === validatorId
}

async function getStatusOfCampaign(campaign) {
	const validators = campaign.spec.validators
	const leader = validators[0]
	const follower = validators[1]

	const callLeader = getRequest(
		`${leader.url}/channel/${campaign.id}/last-approved?withHeartbeat=true`
	)
	const callFollower = getRequest(
		`${follower.url}/channel/${campaign.id}/last-approved?withHeartbeat=true`
	)

	const [dataLeader, dataFollower] = await Promise.all([
		callLeader,
		callFollower,
	])

	const lastApproved = dataLeader.lastApproved
	const leaderHeartbeats = dataLeader.heartbeats || []
	const followerHeartbeats = dataFollower.heartbeats || []
	const messagesFromAll = {
		leaderHeartbeat: leaderHeartbeats.filter(
			hbByValidator.bind(this, leader.id)
		),
		followerHeartbeat: followerHeartbeats.filter(
			hbByValidator.bind(this, leader.id)
		),
		followerFromLeader: leaderHeartbeats.filter(
			hbByValidator.bind(this, follower.id)
		),
		followerFromFollower: followerHeartbeats.filter(
			hbByValidator.bind(this, follower.id)
		),
		newStateLeader: lastApproved ? [lastApproved.newState] : [],
		approveStateFollower: lastApproved ? [lastApproved.approveState] : [],
		rejectStateFollower: lastApproved ? [lastApproved.rejectState] : [],
	}

	const verified = verifyLastApproved(lastApproved, validators)
	const lastApprovedSigs = lastApproved ? getLastSigs(lastApproved) : []
	const lastApprovedBalances = lastApproved ? getLastBalances(lastApproved) : {}
	const statusName = getStatus(messagesFromAll, campaign, lastApprovedBalances)
	return {
		name: statusName,
		closedDate: campaign.status ? campaign.status.closedDate : null,
		humanFriendlyName: getHumanFriendlyName(statusName, campaign),
		lastHeartbeat: {
			leader: getLasHeartbeatTimestamp(messagesFromAll.leaderHeartbeat[0]),
			follower: getLasHeartbeatTimestamp(
				messagesFromAll.followerFromFollower[0]
			),
		},
		lastApprovedSigs,
		lastApprovedBalances,
		verified,
	}
}

function getLastSigs(lastApproved) {
	return [
		lastApproved.newState.msg.signature,
		lastApproved.approveState.msg.signature,
	]
}

function getLastBalances(lastApproved) {
	return lastApproved.newState.msg.balances
}

function getLasHeartbeatTimestamp(msg) {
	if (msg && msg.msg) {
		return msg.msg.timestamp
	} else {
		return null
	}
}

async function getDistributedFunds(campaign, balanceTree) {
	const totalBalances = Object.values(balanceTree).reduce(
		(total, val) => total.add(bigNumberify(val)),
		bigNumberify(0)
	)
	const depositAmount = bigNumberify(campaign.depositAmount)
	const distributedFundsRatio = totalBalances
		.mul(bigNumberify(1000))
		.div(depositAmount) // in promiles

	return +distributedFundsRatio.toString(10)
}

// TODO: use coinmarketcap/kraken price API
// also, update the prices every few minutes in a separate function and just run this with the cached prices
async function getEstimateInUsd(campaign) {
	const { depositAsset, depositAmount } = campaign
	// we normally use stablecoins so assume 1.0
	const [price, decimals] = usdPriceMapping[depositAsset.toLowerCase()] || [
		1.0,
		18,
	]

	const unitsAmount = bigNumberify(depositAmount)
		.mul(bigNumberify(price))
		.toString()
	return parseFloat(formatUnits(unitsAmount, decimals))
}

async function queryValidators() {
	const campaignsCol = db.getMongo().collection('campaigns')
	const channels = await getChannels()
	await channels.map(c =>
		campaignsCol.updateOne({ _id: c.id }, { $setOnInsert: c }, { upsert: true })
	)

	// If a campaign is in Expired, there's no way the state would ever change after that: so no point to update it
	const campaigns = await campaignsCol
		.find({ 'status.name': { $nin: ['Expired'] } })
		.toArray()

	await Promise.all(
		campaigns.map(c =>
			getStatusOfCampaign(c).then(async status => {
				const [fundsDistributedRatio, usdEstimate] = await Promise.all([
					getDistributedFunds(c, status.lastApprovedBalances),
					getEstimateInUsd(c),
				])
				const statusObj = {
					...c.status,
					...status,
					lastChecked: Date.now(),
					usdEstimate,
				}
				// If the status was closed we don't want to update the funds distribution ratio as it will be 100%
				if (status.humanFriendlyName !== 'Closed') {
					statusObj.fundsDistributedRatio = fundsDistributedRatio
				}

				if (status.humanFriendlyName === 'Completed' && !statusObj.closedDate) {
					statusObj.closedDate = Date.now()
				}

				if (status.verified) {
					console.log(`Status of campaign ${c._id} updated: ${status.name}`)
					return campaignsCol.updateOne(
						{ _id: c._id },
						{ $set: { status: statusObj } }
					)
				}
				return Promise.resolve()
			})
		)
	)
}

function startStatusLoop() {
	queryValidators()
	setInterval(queryValidators, cfg.statusLoopTick)
}

module.exports = { startStatusLoop, getEstimateInUsd }
