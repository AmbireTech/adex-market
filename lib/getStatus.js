const cfg = require('../cfg')
const BN = require('bn.js')

function isDateRecent (timestamp) {
	const date = new Date(typeof (timestamp) === 'string' ? timestamp : timestamp * 1000)
	return Date.now() - date.getTime() <= cfg.recency
}

function getRecentHeartbeats (messages) {
	if (!messages) {
		return []
	}
	return messages.filter(m => isDateRecent(m.timestamp))
}

// there are no messages at all for at least one validator
function isInitializing (messagesFromAll) {
	const { leaderHeartbeat, followerHeartbeat, newStateLeader, approveStateFollower } = messagesFromAll
	return (
		(leaderHeartbeat.length === 0 && newStateLeader.length === 0) ||
		(followerHeartbeat.length === 0 && approveStateFollower.length === 0)
	)
}

// at least one validator doesn't have a recent Heartbeat message
function isOffline (messagesFromAll) {
	const { leaderHeartbeat, followerHeartbeat } = messagesFromAll
	const recentLeaderHb = getRecentHeartbeats(leaderHeartbeat)
	const recentFollowerHb = getRecentHeartbeats(followerHeartbeat)
	return recentLeaderHb.length === 0 || recentFollowerHb.length === 0
}

// validators have recent Heartbeat messages, but they don't seem to be propagating messages between one another (the majority of Heartbeats are not found on both validators)
function isDisconnected (messagesFromAll) {
	const { leaderHeartbeat, followerHeartbeat } = messagesFromAll

	const recentLeaderHb = getRecentHeartbeats(leaderHeartbeat)
	const recentFollowerHb = getRecentHeartbeats(followerHeartbeat)

	const totalMessages = recentLeaderHb.length

	const matchingMessages = recentLeaderHb.filter((h1) => {
		return recentFollowerHb.some((h2) => {
			return h1.signature === h2.signature && h1.timestamp === h2.timestamp
		})
	}).length

	return matchingMessages < (totalMessages / 2)
}

// there are recent NewState messages, but the follower does not issue or propagate ApproveState
function isInvalid (messagesFromAll) {
	const { newStateLeader, approveStateFollower } = messagesFromAll
	if (!approveStateFollower[0] && newStateLeader[0]) {
		return true
	}
	return false
}

// there are recent NewState and ApproveState, but the ApproveState reports unhealthy
function isUnhealthy (messagesFromAll) {
	const { newStateLeader, approveStateFollower } = messagesFromAll
	if (newStateLeader[0] && approveStateFollower[0]) {
		return !approveStateFollower[0].isHealthy
	}
	return false
}

// there are NewState, ApproveState and recent Heartbeat's, and the ApproveState reports healthy
function isActive (messagesFromAll) {
	const { leaderHeartbeat, followerHeartbeat, newStateLeader, approveStateFollower } = messagesFromAll
	const isHealthy = approveStateFollower[0] ? approveStateFollower[0].isHealthy : false

	const recentLeaderHb = getRecentHeartbeats(leaderHeartbeat)
	const recentFollowerHb = getRecentHeartbeats(followerHeartbeat)

	const isActive =
		(recentLeaderHb.length > 0) &&
		(recentFollowerHb.length > 0) &&
		!!newStateLeader[0] &&
		!!approveStateFollower[0] &&
		isHealthy

	return isActive
}

// both validators have a recent Heartbeat but a NewState has never been emitted
function isReady (messagesFromAll) {
	const { leaderHeartbeat, followerHeartbeat, newStateLeader } = messagesFromAll

	const recentLeaderHb = getRecentHeartbeats(leaderHeartbeat)
	const recentFollowerHb = getRecentHeartbeats(followerHeartbeat)

	return recentLeaderHb.length > 0 && recentFollowerHb.length > 0 && newStateLeader.length === 0
}

// all of the funds in the channel have been distributed
function isExhausted (campaign, balanceTree) {
	const totalBalances = Object.values(balanceTree).reduce((total, val) => total.add(new BN(val)), new BN(0))
	return totalBalances.gte(new BN(campaign.depositAmount))
}

// the channel is expired
function isExpired (campaign) {
	return Date.now() > new Date(campaign.validUntil * 1000).getTime()
}

module.exports = {
	isInitializing,
	isOffline,
	isDisconnected,
	isInvalid,
	isUnhealthy,
	isReady,
	isActive,
	isExhausted,
	isExpired
}
