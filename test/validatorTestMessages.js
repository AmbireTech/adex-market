const nowDate = Date.now().toString(16).padStart(64, 0)
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

const heartbeatMessageNowDate2 = {
	_id: ObjectId('5c861dc5f0b12d358bcf1f1b'),
	channelId: 'awesomeTestChannel',
	from: 'awesomeFollower',
	submittedBy: 'awesomeFollower',
	msg: {
		type: 'Heartbeat',
		timestamp: nowDate,
		signature: 'Dummy adapter signature for cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec24 by awesomeFollower 2',
		stateRoot: 'cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec25'
	}
}

const heartbeatMessageNowDate3 = {
	_id: ObjectId('5c861dc5f0b12d358bcf1f1b'),
	channelId: 'awesomeTestChannel',
	from: 'awesomeFollower',
	submittedBy: 'awesomeFollower',
	msg: {
		type: 'Heartbeat',
		timestamp: nowDate,
		signature: 'Dummy adapter signature for cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec24 by awesomeFollower 3',
		stateRoot: 'cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec26'
	}
}

const heartbeatMessageNowDate4 = {
	_id: ObjectId('5c861dc5f0b12d358bcf1f1b'),
	channelId: 'awesomeTestChannel',
	from: 'awesomeFollower',
	submittedBy: 'awesomeFollower',
	msg: {
		type: 'Heartbeat',
		timestamp: nowDate,
		signature: 'Dummy adapter signature for cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec24 by awesomeFollower 4',
		stateRoot: 'cc43cd5a31f60002f08f18ef311d1c3e3114d52d59257fbcf861c9c3fd6bec27'
	}
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
		heartbeatMessageNowDate,
		heartbeatMessageNowDate2
	],
	[
		heartbeatMessageNowDate3,
		heartbeatMessageNowDate4
	]
]

// 50% of messages match
const disconnectedMessages2 = [
	[
		heartbeatMessageNowDate,
		heartbeatMessageNowDate2
	],
	[
		heartbeatMessageNowDate,
		heartbeatMessageNowDate3
	]
]

// Majority of messages match
const notDisconnectedMessages = [
	[
		heartbeatMessageNowDate,
		heartbeatMessageNowDate2
	],
	[
		heartbeatMessageNowDate,
		heartbeatMessageNowDate2
	]
]

// Recent newstate but no approvestate
const invalidMessages = [
	[
		heartbeatMessageNowDate,
		newStateMessage
	],
	[
		heartbeatMessageNowDate,
		newStateMessage
	]
]

// Recent newstate and approvestate
const notInvalidMessages1 = [
	[
		heartbeatMessageNowDate,
		newStateMessage
	],
	[
		heartbeatMessageNowDate,
		newStateMessage,
		approveStateMessageHealthy
	]
]

// No approvestate but also no recent newstate
const notInvalidMessages2 = [
	[
		heartbeatMessageNowDate
	],
	[
		heartbeatMessageNowDate,
		newStateMessage
	]
]

// Approvestate but no recent newstate
const notInvalidMessages3 = [
	[
		heartbeatMessageNowDate
	],
	[
		heartbeatMessageNowDate,
		approveStateMessageHealthy
	]
]

// 0 newstate messages and no approvestate
const notInvalidMessages4 = [
	[
		heartbeatMessageNowDate
	],
	[
		heartbeatMessageNowDate
	]
]

// Recent heartbeat and newstate but approvestate reports unhealthy
const unhealthyMessages = [
	[
		heartbeatMessageNowDate,
		newStateMessage
	],
	[
		heartbeatMessageNowDate,
		newStateMessage,
		approveStateMessageUnhealthy
	]
]

// Recent heartbeat and newstate and approvestate reports healthy
const notUnhealthyMessages1 = [
	[
		heartbeatMessageNowDate,
		newStateMessage
	],
	[
		heartbeatMessageNowDate,
		newStateMessage,
		approveStateMessageHealthy
	]
]

// No recent newstate but everything else is ok
const notUnhealthyMessages2 = [
	[
		heartbeatMessageNowDate,
		newStateMessage
	],
	[
		heartbeatMessageNowDate,
		approveStateMessageUnhealthy
	]
]

// No newstate messages but everything else is ok
const notUnhealthyMessages3 = [
	[
		heartbeatMessageNowDate
	],
	[
		heartbeatMessageNowDate,
		approveStateMessageUnhealthy
	]
]

// recent heartbeat but newstate not emitted
const readyMessages1 = [
	[
		heartbeatMessageNowDate
	],
	[
		heartbeatMessageNowDate
	]
]

// recent heartbeat but newstate is emitted
const notReadyMessages1 = [
	[
		heartbeatMessageNowDate,
		newStateMessage
	],
	[
		heartbeatMessageNowDate
	]
]

// one heartbeat not recent and new state emitted
const notReadyMessages2 = [
	[
		heartbeatMessageNowDate,
		newStateMessage
	],
	[
		heartbeatMessageOldDate,
		newStateMessage
	]
]

// no newstate emitted but one heartbeat is not recent
const notReadyMessages3 = [
	[
		heartbeatMessageOldDate
	],
	[
		heartbeatMessageNowDate
	]
]

// no heartbeat but newstate is emitted
const notReadyMessages4 = [
	[
		newStateMessage
	],
	[
		newStateMessage
	]
]

// A situation where it works
const activeMessages = [
	[
		heartbeatMessageNowDate,
		newStateMessage
	],
	[
		heartbeatMessageNowDate,
		newStateMessage,
		approveStateMessageHealthy
	]
]

// Working example but we switch isHealthy to false
const notActiveMessages1 = [
	[
		heartbeatMessageNowDate,
		newStateMessage
	],
	[
		heartbeatMessageNowDate,
		newStateMessage,
		approveStateMessageHealthy
	]
]

// Working example but one NewState is not recent
const notActiveMessages2 = [
	[
		heartbeatMessageNowDate,
		newStateMessage
	],
	[
		heartbeatMessageNowDate,
		approveStateMessageHealthy
	]
]

// Working example but one Heartbeat is not recent
const notActiveMessages3 = [
	[
		heartbeatMessageOldDate,
		newStateMessage
	],
	[
		heartbeatMessageNowDate,
		newStateMessage,
		approveStateMessageHealthy
	]
]

// Working example but there's no approveState
const notActiveMessages4 = [
	[
		heartbeatMessageNowDate,
		newStateMessage
	],
	[
		heartbeatMessageNowDate,
		newStateMessage
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
	validUntil: oldDate,
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
