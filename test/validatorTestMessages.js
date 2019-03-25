const nowDate = Date.now().toString(16).padStart(64, 0)
const notNowDate = (Date.now() - 1000).toString(16).padStart(64, 0)
const oldDate = (Date.now() - 10000000).toString(16).padStart(64, 0)
const inTheFuture = (Date.now() + 10000000).toString(16).padStart(64, 0)
const ObjectId = require('mongodb').ObjectId
const heartbeatMessageOldDate = {
	_id: ObjectId('5c861dc5f0b12d358bcf1f1b'),
	channelId: 'awesomeTestChannel',
	from: 'awesomeFollower',
	submittedBy: 'awesomeFollower',
	msg: {
		type: 'Heartbeat',
		timestamp: oldDate,
		signature: 'Dummy adapter signature for cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec24 by awesomeFollower',
		stateRoot: 'cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec24'
	}
}

const heartbeatMessageNowDate = {
	_id: ObjectId('5c861dc5f0b12d358bcf1f1b'),
	channelId: 'awesomeTestChannel',
	from: 'awesomeFollower',
	submittedBy: 'awesomeFollower',
	msg: {
		type: 'Heartbeat',
		timestamp: nowDate,
		signature: 'Dummy adapter signature for cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec24 by awesomeFollower',
		stateRoot: 'cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec24'
	}
}

// Empty messages
const initializingMessages1 = [
	[],
	[]
]
const initializingMessages2 = [
	[heartbeatMessageNowDate],
	[]
]
const initializingMessages3 = [
	[],
	[heartbeatMessageNowDate]
]

// Not empty messages
const notInitializingMessages = [
	[heartbeatMessageNowDate],
	[heartbeatMessageNowDate]
]

// No recent heartbeat on both
const offlineMessages1 = [
	[heartbeatMessageOldDate],
	[heartbeatMessageOldDate]
]

// No recent heartbeat on second
const offlineMessages2 = [
	[heartbeatMessageNowDate],
	[heartbeatMessageOldDate]
]

// No recent heartbeat on first
const offlineMessages3 = [
	[heartbeatMessageOldDate],
	[heartbeatMessageNowDate]
]

// Recent heartbeat on both
const notOfflineMessages = [
	[heartbeatMessageNowDate],
	[heartbeatMessageNowDate]
]

// More than 50% of messages dont match
const disconnectedMessages1 = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 2' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 5' },
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 6' }
	]
]

// 50% of messages match
const disconnectedMessages2 = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 2' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 6' }
	]
]

// Majority of messages match
const notDisconnectedMessages = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 2' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 2' }
	]
]

// Messages dont match due to different stateroot
const disconnectedMessages3 = [
	[
		{ type: 'Heartbeat', stateRoot: '63chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 2' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 2' }
	]
]

// Messaged dont match due to different date
const disconnectedMessages4 = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 2' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: notNowDate, signature: 'signature for test message 5' },
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 6' }
	]
]

// There are 0 heartbeat messages on first validator
const disconnectedMessages5 = [
	[
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' }
	]
]

// There are 0 heartbeat messages on second validator
const disconnectedMessages6 = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' }
	]
]

// There are 0 heartbeat messages on both validators
const disconnectedMessages7 = [
	[
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' }
	]
]

// Recent newstate but no approvestate
const invalidMessages = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1' }
	]
]

// Recent newstate and approvestate
const notInvalidMessages1 = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1' },
		{ type: 'ApproveState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1', isHealthy: true }
	]
]

// No approvestate but also no recent newstate
const notInvalidMessages2 = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: oldDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1' }
	]
]

// Approvestate but no recent newstate
const notInvalidMessages3 = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: oldDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: oldDate, signature: 'signature for test message 1' },
		{ type: 'ApproveState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1', isHealthy: true }
	]
]

// 0 newstate messages and no approvestate
const notInvalidMessages4 = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' }
	]
]

// Recent heartbeat and newstate but approvestate reports unhealthy
const unhealthyMessages = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1' },
		{ type: 'ApproveState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1', isHealthy: false }
	]
]

// Recent heartbeat and newstate and approvestate reports healthy
const notUnhealthyMessages1 = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1' },
		{ type: 'ApproveState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1', isHealthy: true }
	]
]

// No recent newstate but everything else is ok
const notUnhealthyMessages2 = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: oldDate, signature: 'signature for test message 1' },
		{ type: 'ApproveState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1', isHealthy: false }
	]
]

// No newstate messages but everything else is ok
const notUnhealthyMessages3 = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'ApproveState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1', isHealthy: false }
	]
]

// recent heartbeat but newstate not emitted
const readyMessages1 = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' }
	]
]

// recent heartbeat but newstate is emitted
const notReadyMessages1 = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' }
	]
]

// one heartbeat not recent and new state emitted
const notReadyMessages2 = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: oldDate, signature: 'signature for test message 5' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' }
	]
]

// no newstate emitted but one heartbeat is not recent
const notReadyMessages3 = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: oldDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' }
	]
]

// no heartbeat but newstate is emitted
const notReadyMessages4 = [
	[
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' }
	]
]

// A situation where it works
const activeMessages = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1' },
		{ type: 'ApproveState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1', isHealthy: true }
	]
]

// Working example but we switch isHealthy to false
const notActiveMessages1 = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1' },
		{ type: 'ApproveState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1', isHealthy: false }
	]
]

// Working example but one NewState is not recent
const notActiveMessages2 = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: oldDate, signature: 'signature for test message 1' },
		{ type: 'ApproveState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1', isHealthy: true }
	]
]

// Working example but one Heartbeat is not recent
const notActiveMessages3 = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: oldDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1' },
		{ type: 'ApproveState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1', isHealthy: true }
	]
]

// Working example but there's no approveState
const notActiveMessages4 = [
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1' }
	],
	[
		{ type: 'Heartbeat', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', timestamp: nowDate, signature: 'signature for test message 1' },
		{ type: 'NewState', stateRoot: '64chars 64chars 64chars 64chars 64chars 64chars 64chars 64chars ', lastEvAggr: nowDate, signature: 'signature for test message 1' }
	]
]

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
					url: 'http://localhost:8005'
				},
				{
					id: 'awesomeFollower',
					url: 'http://localhost:8006'
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
					url: 'http://localhost:8005'
				},
				{
					id: 'awesomeFollower',
					url: 'http://localhost:8006'
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
					url: 'http://localhost:8005'
				},
				{
					id: 'awesomeFollower',
					url: 'http://localhost:8006'
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
	validUntil: oldDate,
	spec: {
		validators: [
			{
				id: 'awesomeLeader',
				url: 'http://localhost:8005'
			},
			{
				id: 'awesomeFollower',
				url: 'http://localhost:8006'
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
				url: 'http://localhost:8005'
			},
			{
				id: 'awesomeFollower',
				url: 'http://localhost:8006'
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
	disconnected: { first: disconnectedMessages1, second: disconnectedMessages2, third: disconnectedMessages3, fourth: disconnectedMessages4, fifth: disconnectedMessages5, sixth: disconnectedMessages6, seventh: disconnectedMessages7 },
	notDisconnected: { first: notDisconnectedMessages },
	invalid: { first: invalidMessages },
	notInvalid: { first: notInvalidMessages1, second: notInvalidMessages2, third: notInvalidMessages3, fourth: notInvalidMessages4 },
	unhealthy: { first: unhealthyMessages },
	notUnhealthy: { first: notUnhealthyMessages1, second: notUnhealthyMessages2, third: notUnhealthyMessages3 },
	ready: { first: readyMessages1 },
	notReady: { first: notReadyMessages1, second: notReadyMessages2, third: notReadyMessages3, fourth: notReadyMessages4 },
	active: { first: activeMessages },
	notActive: { first: notActiveMessages1, second: notActiveMessages2, third: notActiveMessages3, fourth: notActiveMessages4 },
	exhausted: { first: exhausted1, second: exhausted2 },
	notExhausted: { first: notExhausted },
	expired: { first: expiredCampaign },
	notExpired: { first: notExpiredCampaign }
}
