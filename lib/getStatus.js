const cfg = require('../cfg')

function isDateRecent (timestamp) {
	return Date.now() - timestamp <= cfg.recency
}

function filterMessages (type, getOnlyRecent) {
	return (m) => {
		const timestamp = m.timestamp
		return (m.type === type && (!getOnlyRecent || isDateRecent(timestamp)))
	}
}

function containsMessages (type, getOnlyRecent) {
	return (m) => {
		const timestamp = m.timestamp
		return m.type === type && (!getOnlyRecent || isDateRecent(timestamp))
	}
}

function getApproveStateMessage (message) {
	return message.type === 'ApproveState'
}

// there are no messages at all for at least one validator
function isInitializing (messagesFromAll) {
	return messagesFromAll.some((messages) => {
		return messages.length === 0
	})
}

// at least one validator doesn't have a recent Heartbeat message
function isOffline (messagesFromAll) {
	return messagesFromAll.some((m) => {
		return m.filter(filterMessages('Heartbeat', true)).length === 0
	})
}

// validators have recent Heartbeat messages, but they don't seem to be propagating messages between one another (the majority of Heartbeats are not found on both validators)
function isDisconnected (messagesFromAll) {
	const messagesFromLeader = messagesFromAll[0]
	const messagesFromFollower = messagesFromAll[1]

	const heartbeatMessagesLeader = messagesFromLeader.filter(filterMessages('Heartbeat', false))
	const heartbeatMessagesFollower = messagesFromFollower.filter(filterMessages('Heartbeat', false))

	const totalMessages = heartbeatMessagesLeader.length

	let matchingMessages = heartbeatMessagesLeader.filter((h1) => {
		const match = heartbeatMessagesFollower.some((h2) => {
			return (
				h1.channelId === h2.channelId &&
				h1.from === h2.from &&
				h1.submittedBy === h2.submittedBy &&
				h1.msg.type === h2.msg.type
			)
		})
		return match
	}).length

	return matchingMessages <= (totalMessages / 2)
}

// there are recent NewState messages, but the follower does not issue or propagate ApproveState
function isInvalid (messagesFromAll) {
	const messagesFromLeader = messagesFromAll[0]
	const messagesFromFollower = messagesFromAll[1]

	const recentNewStateLeader = messagesFromLeader.some(containsMessages('NewState', true))
	const recentNewStateFollower = messagesFromFollower.some(containsMessages('NewState', true))
	const followerPropagatesApproveState = messagesFromFollower.some(containsMessages('ApproveState', false))

	if (recentNewStateLeader && recentNewStateFollower && !followerPropagatesApproveState) {
		return true
	}
	return false
}

// there are recent NewState and ApproveState, but the ApproveState reports unhealthy
function isUnhealthy (messagesFromAll) {
	const messagesFromLeader = messagesFromAll[0]
	const messagesFromFollower = messagesFromAll[1]

	const recentNewStateLeader = messagesFromLeader.some(containsMessages('NewState', true))
	const recentNewStateFollower = messagesFromFollower.some(containsMessages('NewState', true))
	const followerPropagatesApproveState = messagesFromFollower.some(containsMessages('ApproveState', false))
	if (recentNewStateLeader && recentNewStateFollower && followerPropagatesApproveState) {
		const approved = messagesFromFollower.filter(getApproveStateMessage)[0]
		return !approved.isHealthy
	}
	return false
}

// both validators have a recent Heartbeat but a NewState has never been emitted
function isReady (messagesFromAll) {
	const messagesFromLeader = messagesFromAll[0]
	const messagesFromFollower = messagesFromAll[1]

	const recentHbLeader = messagesFromLeader.filter(filterMessages('Heartbeat', true))
	const recentHbFollower = messagesFromFollower.filter(filterMessages('Heartbeat', true))
	const newStateLeader = messagesFromLeader.some(containsMessages('NewState', false))
	const newStateFollower = messagesFromFollower.some(containsMessages('NewState', false))

	if (recentHbLeader.length > 0 &&
    recentHbFollower.length > 0 &&
    !newStateLeader &&
    !newStateFollower) {
		return true
	}
	return false
}

// there are recent NewState, ApproveState and Heartbeat's, and the ApproveState reports healthy
function isActive (messagesFromAll) {
	const messagesFromLeader = messagesFromAll[0]
	const messagesFromFollower = messagesFromAll[1]

	const recentHbLeader = messagesFromLeader.filter(filterMessages('Heartbeat', true))
	const recentHbFollower = messagesFromFollower.filter(filterMessages('Heartbeat', true))
	const recentNewStateLeader = messagesFromLeader.filter(filterMessages('NewState', true))
	const recentNewStateFollower = messagesFromFollower.filter(filterMessages('NewState', true))
	const approved = messagesFromFollower.filter(getApproveStateMessage)[0]
	const isHealthy = approved ? approved.isHealthy : false

	if (recentHbLeader.length > 0 &&
      recentHbFollower.length > 0 &&
      recentNewStateLeader.length > 0 &&
      recentNewStateFollower.length > 0 &&
      isHealthy) {
		return true
	}
	return false
}

// all of the funds in the channel have been distributed
function isExhausted (campaign, balanceTree) {
	const totalBalances = Object.keys(balanceTree).reduce((total, current) => total + balanceTree[current], 0)
	return totalBalances >= campaign.depositAmount
}

// the channel is expired
function isExpired (campaign) {
	return Date.now() > new Date(campaign.validUntil).getTime()
}

module.exports = { isInitializing, isOffline, isDisconnected, isInvalid, isUnhealthy, isReady, isActive, isExhausted, isExpired }
