const nowDate = new Date(Date.now()).toISOString()
const oldDate = new Date(Date.now() - 10000000).toISOString()
const oldDateNoHex = (Date.now() - 1000000000) / 1000
const inTheFuture = new Date(Date.now() + 10000000).toISOString()
const twoMinutesAgo = new Date(Date.now() - 1000 * 60 * 2).toISOString()

const VALIDATOR_MSG_FROM_ADDRESS = '0x2892f6C41E0718eeeDd49D98D648C789668cA67d'
const VALIDATOR_MSG_STATE_ROOT =
	'cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec24'
const TEST_CHANNEL_NAME = 'awesomeTestChannel'

const balanceTreeExceeds = {
	lilPeep: 50,
	xxxtentacion: 51,
}

const balanceTreeEquals = {
	lilPeep: 50,
	xxxtentacion: 50,
}

const balanceTreeUnder = {
	lilPeep: 50,
	xxxtentacion: 49,
}

function generateMessage(params) {
	const { type, timestamp, healthy, received } = params

	const validatorMessage = {
		from: VALIDATOR_MSG_FROM_ADDRESS,
		msg: {
			type,
			signature:
				'0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
			stateRoot: VALIDATOR_MSG_STATE_ROOT,
		},
		received: received || nowDate,
	}

	switch (type) {
		case 'Heartbeat':
			validatorMessage.msg['timestamp'] = timestamp
			break
		case 'ApproveState':
			validatorMessage.msg['lastEvAggr'] = timestamp
			validatorMessage.msg['isHealthy'] = healthy
			break
		case 'NewState':
			break
		default:
			break
	}

	return validatorMessage
}

function generateCampaign(params) {
	const { validUntil, balanceTree } = params

	const campaign = {
		campaign: {
			id: TEST_CHANNEL_NAME,
			depositAmount: 100,
			depositAsset: 'DAI',
			spec: {
				validators: [
					{
						id: 'awesomeLeader',
						url: 'https://tom.adex.network',
					},
					{
						id: 'awesomeFollower',
						url: 'https://jerry.adex.network',
					},
				],
			},
		},
	}

	if (balanceTree) {
		campaign['balanceTree'] = balanceTree
	}
	if (validUntil) {
		campaign.campaign['validUntil'] = validUntil
	}

	return campaign
}

const heartbeatMessageOldDate = generateMessage({
	type: 'Heartbeat',
	timestamp: oldDate,
})

const heartbeatMessageNowDate = generateMessage({
	type: 'Heartbeat',
	timestamp: nowDate,
})

const heartbeatMessageNowDate2 = generateMessage({
	type: 'Heartbeat',
	timestamp: nowDate,
})

const newStateMessage = generateMessage({ type: 'NewState' })

const approveStateMessageHealthy = generateMessage({
	type: 'ApproveState',
	healthy: true,
})

const approveStateMessageUnhealthy = generateMessage({
	type: 'ApproveState',
	healthy: false,
})

const newStateMessageOld = generateMessage({
	type: 'NewState',
	healthy: true,
	received: oldDate,
})

const newStateOlderThanMinute = generateMessage({
	type: 'NewState',
	healthy: true,
	received: twoMinutesAgo,
})

const newStateMessageNew = generateMessage({
	type: 'NewState',
	healthy: true,
	received: nowDate,
})

// Empty messages
const initializingMessages1 = {
	leaderHeartbeat: [],
	followerHeartbeat: [],
	newStateLeader: [],
	approveStateFollower: [],
}

const initializingMessages2 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [],
	newStateLeader: [],
	approveStateFollower: [],
}

const initializingMessages3 = {
	leaderHeartbeat: [],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [],
	approveStateFollower: [],
}

// Not empty messages
const notInitializingMessages = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [],
	approveStateFollower: [],
}

// No recent heartbeat on both
const offlineMessages1 = {
	leaderHeartbeat: [heartbeatMessageOldDate],
	followerHeartbeat: [heartbeatMessageOldDate],
	followerFromLeader: [heartbeatMessageOldDate],
	newStateLeader: [],
	approveStateFollower: [],
}

// No recent heartbeat on second
const offlineMessages2 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageOldDate],
	followerFromLeader: [heartbeatMessageOldDate],
	newStateLeader: [],
	approveStateFollower: [],
}

// No recent heartbeat on first
const offlineMessages3 = {
	leaderHeartbeat: [heartbeatMessageOldDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	followerFromLeader: [heartbeatMessageNowDate],
	newStateLeader: [],
	approveStateFollower: [],
}

// Recent heartbeat on both
const notOfflineMessages = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerFromLeader: [heartbeatMessageNowDate],
	newStateLeader: [],
	approveStateFollower: [],
}

// No recent heartbeat messages on both sides
const disconnectedMessages1 = {
	leaderHeartbeat: [heartbeatMessageOldDate],
	followerHeartbeat: [heartbeatMessageOldDate],
	followerFromLeader: [heartbeatMessageOldDate],
	newStateLeader: [],
	approveStateFollower: [],
}

// No recent leader heartbeat messages on follower
const disconnectedMessages2 = {
	leaderHeartbeat: [heartbeatMessageOldDate],
	followerHeartbeat: [heartbeatMessageOldDate],
	followerFromLeader: [heartbeatMessageNowDate],
	newStateLeader: [],
	approveStateFollower: [],
}

// No recent follower heartbeat messages on leader
const disconnectedMessages3 = {
	leaderHeartbeat: [heartbeatMessageOldDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	followerFromLeader: [],
	newStateLeader: [],
	approveStateFollower: [],
}

// Both validators has recent heartbeat messages
const notDisconnectedMessages1 = {
	followerHeartbeat: [heartbeatMessageNowDate],
	followerFromLeader: [heartbeatMessageNowDate2],
	newStateLeader: [],
	approveStateFollower: [],
}

// Recent newstate but no approvestate
const invalidMessages = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	followerFromLeader: [heartbeatMessageNowDate],
	newStateLeader: [newStateMessage],
	approveStateFollower: [],
	latestNewState: [],
}

const invalidMessages2 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	followerFromLeader: [heartbeatMessageNowDate],
	newStateLeader: [newStateMessageOld],
	approveStateFollower: [approveStateMessageHealthy],
	latestNewState: [newStateOlderThanMinute],
}

// Recent newstate and approvestate
const notInvalidMessages1 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [newStateMessage],
	approveStateFollower: [approveStateMessageHealthy],
	latestNewState: [newStateMessageNew],
}

// // No approvestate but also no recent newstate
// const notInvalidMessages2 = {
// 	leaderHeartbeat: [heartbeatMessageNowDate],
// 	followerHeartbeat: [heartbeatMessageNowDate],
// 	newStateLeader: [],
// 	approveStateFollower: [],
// 	latestNewState: [newStateMessageOld],
// }

// // Approvestate but no recent newstate
// const notInvalidMessages3 = {
// 	leaderHeartbeat: [heartbeatMessageNowDate],
// 	followerHeartbeat: [heartbeatMessageNowDate],
// 	newStateLeader: [],
// 	approveStateFollower: [approveStateMessageHealthy],
// 	latestNewState: [newStateMessageOld],
// }

const notInvalidMessages4 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [newStateMessageOld],
	approveStateFollower: [approveStateMessageHealthy],
	latestNewState: [newStateMessageNew],
}

const notInvalidMessages5 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [newStateOlderThanMinute],
	approveStateFollower: [approveStateMessageHealthy],
	latestNewState: [newStateOlderThanMinute],
}

const notInvalidMessages6 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [newStateMessageNew],
	approveStateFollower: [approveStateMessageHealthy],
	latestNewState: [newStateMessageNew],
}

// Recent heartbeat and newstate but approvestate reports unhealthy
const unhealthyMessages = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	followerFromLeader: [heartbeatMessageNowDate],
	newStateLeader: [newStateMessage],
	approveStateFollower: [approveStateMessageUnhealthy],
	latestNewState: [newStateMessageNew],
}

// Recent heartbeat and newstate and approvestate reports healthy
const notUnhealthyMessages1 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [newStateMessage],
	approveStateFollower: [approveStateMessageHealthy],
}

// No newstate messages but everything else is ok
const notUnhealthyMessages2 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [],
	approveStateFollower: [approveStateMessageUnhealthy],
}

// recent heartbeat but newstate not emitted
const readyMessages1 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	followerFromLeader: [heartbeatMessageNowDate],
	newStateLeader: [],
	approveStateFollower: [],
}

// recent heartbeat but newstate is emitted
const notReadyMessages1 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [newStateMessage],
	approveStateFollower: [],
}

// one heartbeat not recent and new state emitted
const notReadyMessages2 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageOldDate],
	newStateLeader: [newStateMessage],
	approveStateFollower: [],
}

// no newstate emitted but one heartbeat is not recent
const notReadyMessages3 = {
	leaderHeartbeat: [heartbeatMessageOldDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [],
	approveStateFollower: [],
}

/*
// no heartbeat but newstate is emitted
const notReadyMessages4 = {
	leaderHeartbeat: [],
	followerHeartbeat: [],
	newStateLeader: [newStateMessage],
	approveStateFollower: []
}
*/

// A situation where it works
const activeMessages = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	followerFromLeader: [heartbeatMessageNowDate],
	newStateLeader: [newStateMessage],
	approveStateFollower: [approveStateMessageHealthy],
	latestNewState: [newStateMessage],
}

// Working example but we switch isHealthy to false
const notActiveMessages1 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [newStateMessage],
	approveStateFollower: [approveStateMessageUnhealthy],
}

//  No newState
const notActiveMessages2 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [],
	approveStateFollower: [approveStateMessageHealthy],
}

// one Heartbeat is not recent
const notActiveMessages3 = {
	leaderHeartbeat: [heartbeatMessageOldDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [newStateMessage],
	approveStateFollower: [approveStateMessageHealthy],
}

// Total balances is more than depositAmount
const exhausted1 = generateCampaign({ balanceTree: balanceTreeExceeds })

// Total balances is equal to depositAmount
const exhausted2 = generateCampaign({ balanceTree: balanceTreeEquals })

// Total balances is less than depositAmount
const notExhausted = generateCampaign({ balanceTree: balanceTreeUnder })

// Expired
const expiredCampaign = generateCampaign({ validUntil: oldDateNoHex })

// Not expired
const notExpiredCampaign = generateCampaign({ validUntil: inTheFuture })

module.exports = {
	initializing: {
		first: initializingMessages1,
		second: initializingMessages2,
		third: initializingMessages3,
	},
	notInitializing: { first: notInitializingMessages },
	offline: {
		first: offlineMessages1,
		second: offlineMessages2,
		third: offlineMessages3,
	},
	notOffline: { first: notOfflineMessages },
	disconnected: {
		first: disconnectedMessages1,
		second: disconnectedMessages2,
		third: disconnectedMessages3,
	},
	notDisconnected: { first: notDisconnectedMessages1 },
	invalid: {
		first: invalidMessages,
		second: invalidMessages2,
	},
	notInvalid: {
		first: notInvalidMessages1,
		// second: notInvalidMessages2,
		// third: notInvalidMessages3,
		fourth: notInvalidMessages4,
		fifth: notInvalidMessages5,
		sixth: notInvalidMessages6,
	},
	unhealthy: { first: unhealthyMessages },
	notUnhealthy: { first: notUnhealthyMessages1, second: notUnhealthyMessages2 },
	ready: { first: readyMessages1 },
	notReady: {
		first: notReadyMessages1,
		second: notReadyMessages2,
		third: notReadyMessages3,
	},
	active: { first: activeMessages },
	notActive: {
		first: notActiveMessages1,
		second: notActiveMessages2,
		third: notActiveMessages3,
	},
	exhausted: { first: exhausted1, second: exhausted2 },
	notExhausted: { first: notExhausted },
	expired: { first: expiredCampaign },
	notExpired: { first: notExpiredCampaign },
}
