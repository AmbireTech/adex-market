
const nowDate = (Math.floor(Date.now() / 1000))
const oldDate = (Math.floor((Date.now() - 10000000) / 1000))
const oldDateNoHex = Math.floor((Date.now() - 10000000) / 1000)
const inTheFuture = Math.floor((Date.now() + 10000000) / 1000)
const heartbeatMessageOldDate = {
	type: 'Heartbeat',
	timestamp: oldDate,
	signature: 'Dummy adapter signature for cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec24 by awesomeFollower',
	stateRoot: 'cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec24'
}

const heartbeatMessageNowDate = {
	type: 'Heartbeat',
	timestamp: nowDate,
	signature: 'Dummy adapter signature for cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec24 by awesomeFollower',
	stateRoot: 'cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec24'
}

const heartbeatMessageNowDate2 = {
	type: 'Heartbeat',
	timestamp: nowDate,
	signature: 'Dummy adapter signature for cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec24 by awesomeFollower 2',
	stateRoot: 'cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec25'
}

const heartbeatMessageNowDate3 = {
	type: 'Heartbeat',
	timestamp: nowDate,
	signature: 'Dummy adapter signature for cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec24 by awesomeFollower 3',
	stateRoot: 'cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec26'
}

const heartbeatMessageNowDate4 = {
	type: 'Heartbeat',
	timestamp: nowDate,
	signature: 'Dummy adapter signature for cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec24 by awesomeFollower 4',
	stateRoot: 'cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec27'
}

const newStateMessage = {
	type: 'NewState',
	stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ',
	signature: 'signature for test message 1'
}

const approveStateMessageHealthy = {
	type: 'ApproveState',
	stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ',
	lastEvAggr: nowDate,
	signature: 'signature for test message 1',
	isHealthy: true
}

const approveStateMessageUnhealthy = {
	type: 'ApproveState',
	stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ',
	lastEvAggr: nowDate,
	signature: 'signature for test message 1',
	isHealthy: false
}

// Empty messages
const initializingMessages1 = {
	leaderHeartbeat: [],
	followerHeartbeat: [],
	newStateLeader: [],
	approveStateFollower: []
}

const initializingMessages2 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [],
	newStateLeader: [],
	approveStateFollower: []
}

const initializingMessages3 = {
	leaderHeartbeat: [],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [],
	approveStateFollower: []
}

// Not empty messages
const notInitializingMessages = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [],
	approveStateFollower: []
}

// No recent heartbeat on both
const offlineMessages1 = {
	leaderHeartbeat: [heartbeatMessageOldDate],
	followerFromLeader: [heartbeatMessageOldDate],
	newStateLeader: [],
	approveStateFollower: []
}

// No recent heartbeat on second
const offlineMessages2 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerFromLeader: [heartbeatMessageOldDate],
	newStateLeader: [],
	approveStateFollower: []
}

// No recent heartbeat on first
const offlineMessages3 = {
	leaderHeartbeat: [heartbeatMessageOldDate],
	followerFromLeader: [heartbeatMessageNowDate],
	newStateLeader: [],
	approveStateFollower: []
}

// Recent heartbeat on both
const notOfflineMessages = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerFromLeader: [heartbeatMessageNowDate],
	newStateLeader: [],
	approveStateFollower: []
}

// More than 50% of messages dont match
const disconnectedMessages1 = {
	followerHeartbeat: [heartbeatMessageNowDate, heartbeatMessageNowDate2],
	followerFromFollower: [heartbeatMessageNowDate3, heartbeatMessageNowDate4],
	newStateLeader: [],
	approveStateFollower: []
}

// 50% of messages match
const disconnectedMessages2 = {
	followerHeartbeat: [heartbeatMessageNowDate, heartbeatMessageNowDate2],
	followerFromFollower: [heartbeatMessageNowDate3, heartbeatMessageNowDate4],
	newStateLeader: [],
	approveStateFollower: []
}

// Majority of messages match
const notDisconnectedMessages1 = {
	followerHeartbeat: [heartbeatMessageNowDate, heartbeatMessageNowDate2],
	followerFromFollower: [heartbeatMessageNowDate, heartbeatMessageNowDate2],
	newStateLeader: [],
	approveStateFollower: []
}

// Recent newstate but no approvestate
const invalidMessages = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [newStateMessage],
	approveStateFollower: []
}

// Recent newstate and approvestate
const notInvalidMessages1 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [newStateMessage],
	approveStateFollower: [approveStateMessageHealthy]
}

// No approvestate but also no recent newstate
const notInvalidMessages2 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [],
	approveStateFollower: []
}

// Approvestate but no recent newstate
const notInvalidMessages3 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [],
	approveStateFollower: [approveStateMessageHealthy]
}

// 0 newstate messages and no approvestate
const notInvalidMessages4 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [],
	approveStateFollower: []
}

// Recent heartbeat and newstate but approvestate reports unhealthy
const unhealthyMessages = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [newStateMessage],
	approveStateFollower: [approveStateMessageUnhealthy]
}

// Recent heartbeat and newstate and approvestate reports healthy
const notUnhealthyMessages1 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [newStateMessage],
	approveStateFollower: [approveStateMessageHealthy]
}

// No newstate messages but everything else is ok
const notUnhealthyMessages2 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [],
	approveStateFollower: [approveStateMessageUnhealthy]
}

// recent heartbeat but newstate not emitted
const readyMessages1 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [],
	approveStateFollower: []
}

// recent heartbeat but newstate is emitted
const notReadyMessages1 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [newStateMessage],
	approveStateFollower: []
}

// one heartbeat not recent and new state emitted
const notReadyMessages2 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageOldDate],
	newStateLeader: [newStateMessage],
	approveStateFollower: []
}

// no newstate emitted but one heartbeat is not recent
const notReadyMessages3 = {
	leaderHeartbeat: [heartbeatMessageOldDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [],
	approveStateFollower: []
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
	newStateLeader: [newStateMessage],
	approveStateFollower: [approveStateMessageHealthy]
}

// Working example but we switch isHealthy to false
const notActiveMessages1 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [newStateMessage],
	approveStateFollower: [approveStateMessageUnhealthy]
}

//  No newState
const notActiveMessages2 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [],
	approveStateFollower: [approveStateMessageHealthy]
}

// one Heartbeat is not recent
const notActiveMessages3 = {
	leaderHeartbeat: [heartbeatMessageOldDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [newStateMessage],
	approveStateFollower: [approveStateMessageHealthy]
}

/*
// Working example but there's no approveState
const notActiveMessages4 = {
	leaderHeartbeat: [heartbeatMessageNowDate],
	followerHeartbeat: [heartbeatMessageNowDate],
	newStateLeader: [newStateMessage],
	approveStateFollower: []
}
*/

// Total balances is more than depositAmount
const exhausted1 = {
	campaign: {
		_id: 'awesomeBTCChannel',
		depositAmount: 100,
		depositAsset: 'DAI',
		id: 'awesomeTestChannel',
		spec: {
			validators: [
				{
					id: 'awesomeLeader',
					url: 'https://tom.adex.network'
				},
				{
					id: 'awesomeFollower',
					url: 'https://jerry.adex.network'
				}
			]
		},
		validators: [
			'awesomeLeader',
			'awesomeFollower'
		]
	},
	balanceTree: {
		lilPeep: 50,
		xxxtentacion: 51
	}
}

// Total balances is equal to depositAmount
const exhausted2 = {
	campaign: {
		_id: 'awesomeBTCChannel',
		depositAmount: 100,
		depositAsset: 'DAI',
		id: 'awesomeTestChannel',
		spec: {
			validators: [
				{
					id: 'awesomeLeader',
					url: 'https://tom.adex.network'
				},
				{
					id: 'awesomeFollower',
					url: 'https://jerry.adex.network'
				}
			]
		},
		validators: [
			'awesomeLeader',
			'awesomeFollower'
		]
	},
	balanceTree: {
		lilPeep: 50,
		xxxtentacion: 50
	}
}

// Total balances is less than depositAmount
const notExhausted = {
	campaign: {
		_id: 'awesomeBTCChannel',
		depositAmount: 100,
		depositAsset: 'DAI',
		id: 'awesomeTestChannel',
		spec: {
			validators: [
				{
					id: 'awesomeLeader',
					url: 'https://tom.adex.network'
				},
				{
					id: 'awesomeFollower',
					url: 'https://jerry.adex.network'
				}
			]
		},
		validators: [
			'awesomeLeader',
			'awesomeFollower'
		]
	},
	balanceTree: {
		lilPeep: 50,
		xxxtentacion: 49
	}
}

// Expired
const expiredCampaign = {
	_id: 'awesomeBTCChannel',
	depositAmount: 100,
	depositAsset: 'DAI',
	id: 'awesomeTestChannel',
	validUntil: oldDateNoHex,
	spec: {
		validators: [
			{
				id: 'awesomeLeader',
				url: 'https://tom.adex.network'
			},
			{
				id: 'awesomeFollower',
				url: 'https://jerry.adex.network'
			}
		]
	},
	validators: [
		'awesomeLeader',
		'awesomeFollower'
	]
}

// Not expired
const notExpiredCampaign = {
	_id: 'awesomeBTCChannel',
	depositAmount: 100,
	depositAsset: 'DAI',
	id: 'awesomeTestChannel',
	validUntil: inTheFuture,
	spec: {
		validators: [
			{
				id: 'awesomeLeader',
				url: 'https://tom.adex.network'
			},
			{
				id: 'awesomeFollower',
				url: 'https://jerry.adex.network'
			}
		]
	},
	validators: [
		'awesomeLeader',
		'awesomeFollower'
	]
}

module.exports = {
	initializing: { first: initializingMessages1, second: initializingMessages2, third: initializingMessages3 },
	notInitializing: { first: notInitializingMessages },
	offline: { first: offlineMessages1, second: offlineMessages2, third: offlineMessages3 },
	notOffline: { first: notOfflineMessages },
	disconnected: { first: disconnectedMessages1, second: disconnectedMessages2 },
	notDisconnected: { first: notDisconnectedMessages1 },
	invalid: { first: invalidMessages },
	notInvalid: { first: notInvalidMessages1, second: notInvalidMessages2, third: notInvalidMessages3, fourth: notInvalidMessages4 },
	unhealthy: { first: unhealthyMessages },
	notUnhealthy: { first: notUnhealthyMessages1, second: notUnhealthyMessages2 },
	ready: { first: readyMessages1 },
	notReady: { first: notReadyMessages1, second: notReadyMessages2, third: notReadyMessages3 },
	active: { first: activeMessages },
	notActive: { first: notActiveMessages1, second: notActiveMessages2, third: notActiveMessages3 },
	exhausted: { first: exhausted1, second: exhausted2 },
	notExhausted: { first: notExhausted },
	expired: { first: expiredCampaign },
	notExpired: { first: notExpiredCampaign }
}
