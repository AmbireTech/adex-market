const cfg = require('../cfg')
const BN = require('bn.js')

function isDateRecent (timestamp) {
	return Date.now() - timestamp <= cfg.recency
}

function getRecentHeartbeats (messages) {
	if (!messages) {
		return []
	}
	return messages.filter(m => isDateRecent(m.timestamp))
}

// there are no messages at all for at least one validator
function isInitializing (messagesFromAll) {
	return Object.values(messagesFromAll).some(x => x.length === 0)
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

	let matchingMessages = recentLeaderHb.filter((h1) => {
		const match = recentFollowerHb.some((h2) => {
			return h1.stateRoot === h2.stateRoot
		})
		return match
	}).length

	return matchingMessages <= (totalMessages / 2)
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

// both validators have a recent Heartbeat but a NewState has never been emitted
function isReady (messagesFromAll) {
	const { leaderHeartbeat, followerHeartbeat, newStateLeader } = messagesFromAll

	const recentLeaderHb = getRecentHeartbeats(leaderHeartbeat)
	const recentFollowerHb = getRecentHeartbeats(followerHeartbeat)

	return recentLeaderHb.length > 0 && recentFollowerHb.length > 0 && newStateLeader[0]
}

// there are recent NewState, ApproveState and Heartbeat's, and the ApproveState reports healthy
function isActive (messagesFromAll) {
	const { leaderHeartbeat, followerHeartbeat, newStateLeader, approveStateFollower } = messagesFromAll
	const isHealthy = approveStateFollower[0] ? approveStateFollower[0].isHealthy : false

	const recentLeaderHb = getRecentHeartbeats(leaderHeartbeat)
	const recentFollowerHb = getRecentHeartbeats(followerHeartbeat)

	if (
		recentLeaderHb.length > 0 &&
		recentFollowerHb.length > 0 &&
		newStateLeader[0] &&
		approveStateFollower[0] &&
		isHealthy
	) {
		return true
	}
	return false
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

module.exports = { isInitializing, isOffline, isDisconnected, isInvalid, isUnhealthy, isReady, isActive, isExhausted, isExpired }
