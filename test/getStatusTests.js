const tape = require('tape')
const { getStatus } = require('../status-loop/queryValidators')
const {
	expiredConfig,
	exhaustedConfig,
	withdrawConfig,
	initializingConfig,
	offlineConfig,
	// disconnectedConfig,
	invalidConfig,
	invalidConfigSecondCase,
	unhealthyConfig,
	activeConfig,
	readyConfig,
} = require('./validatorTestMessages')

tape('getStatus(...) tests', t => {
	t.equals(
		getStatus(...expiredConfig),
		'Expired',
		'Expired status is detected correctly'
	)
	t.equals(
		getStatus(...exhaustedConfig),
		'Exhausted',
		'Exhausted status is detected correctly'
	)
	t.equals(
		getStatus(...withdrawConfig),
		'Withdraw',
		'Withdraw status is detected correctly'
	)
	t.equals(
		getStatus(...initializingConfig),
		'Initializing',
		'Initializing status is detected correctly'
	)
	t.equals(
		getStatus(...offlineConfig),
		'Offline',
		'Offline status is detected correctly'
	)
	// t.equals(
	// 	getStatus(...disconnectedConfig),
	// 	'Disconnected',
	// 	'Disconnected status is detected correctly'
	// )
	t.equals(
		getStatus(...invalidConfig),
		'Invalid',
		'Invalid status is detected correctly'
	)
	t.equals(
		getStatus(...invalidConfigSecondCase),
		'Invalid',
		'Invalid status is detected correctly for the other case'
	)
	t.equals(
		getStatus(...unhealthyConfig),
		'Unhealthy',
		'Unhealthy status is detected correctly'
	)
	t.equals(
		getStatus(...activeConfig),
		'Active',
		'Active status is detected correctly'
	)
	t.equals(
		getStatus(...readyConfig),
		'Ready',
		'Ready status is detected correctly'
	)
	t.end()
})
