const tape = require('tape')
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
	isWithdraw,
} = require('../lib/getStatus')
const vtm = require('./validatorTestMessages')

tape('isInitializing()', function(t) {
	t.equals(
		isInitializing(vtm.initializing.first),
		true,
		'two empty message arrays return true'
	)
	t.equals(
		isInitializing(vtm.initializing.second),
		true,
		'firt message array empty return true'
	)
	t.equals(
		isInitializing(vtm.initializing.third),
		true,
		'second message array empty return true'
	)
	t.equals(
		isInitializing(vtm.notInitializing.first),
		false,
		'two arrays with messages return false'
	)
	t.end()
})

tape('isOffline()', function(t) {
	t.equals(
		isOffline(vtm.offline.first),
		true,
		'Two messages with not recent heartbeat messages return true'
	)
	t.equals(
		isOffline(vtm.offline.second),
		true,
		"When first message has recent heartbeat timestamp but second hasn't return true"
	)
	t.equals(
		isOffline(vtm.offline.third),
		true,
		"When second message has recent heartbeat timestamp but first hasn't return true"
	)
	t.equals(
		isOffline(vtm.notOffline.first),
		false,
		'When both messages have a heartbeat with recent timestamp return false'
	)
	t.end()
})

tape('isDisconnected()', function(t) {
	t.equals(
		isDisconnected(vtm.disconnected.first),
		true,
		'No recent heartbeat messages on both sides returns true'
	)
	t.equals(
		isDisconnected(vtm.disconnected.second),
		true,
		' No recent leader heartbeat messages on follower returns true'
	)
	t.equals(
		isDisconnected(vtm.disconnected.third),
		true,
		'No recent follower heartbeat messages on leader returns true'
	)
	t.equals(
		isDisconnected(vtm.notDisconnected.first),
		false,
		'Both validators has recent heartbeat messages return false'
	)
	t.end()
})

tape('isInvalid()', function(t) {
	t.equals(
		isInvalid(vtm.invalid.first),
		true,
		'Recent NewState messages but follower does not propagate approveState returns true'
	)
	t.equals(
		isInvalid(vtm.invalid.second),
		true,
		'Last approved newState is older than latest newstate and latest newstate is older than one minute returns true'
	)
	t.equals(
		isInvalid(vtm.notInvalid.first),
		false,
		'Recent NewState messages and follower propagates approveState returns false'
	)
	// t.equals(
	// 	isInvalid(vtm.notInvalid.second),
	// 	false,
	// 	"Follower does not propagate approveState but one of the NewState messages isn't recent returns false"
	// )
	// t.equals(
	// 	isInvalid(vtm.notInvalid.third),
	// 	false,
	// 	'ApproveState but no recent NewState returns false'
	// )
	t.equals(
		isInvalid(vtm.notInvalid.fourth),
		false,
		'Last approved newState is older than latest newstate but NOT older than a minute returns false'
	)
	t.equals(
		isInvalid(vtm.notInvalid.fifth),
		false,
		'Last approved newState is same as latest newstate but older than a minute returns false'
	)
	t.equals(
		isInvalid(vtm.notInvalid.sixth),
		false,
		'Last approved newState is neither older than the latest nor older than a minute returns false'
	)
	t.end()
})

tape('isUnhealthy()', function(t) {
	t.equals(
		isUnhealthy(vtm.unhealthy.first),
		true,
		'Recent NewState and approveState but approveState reports unhealthy returns true'
	)
	t.equals(
		isUnhealthy(vtm.notUnhealthy.first),
		false,
		'Recent NewState and approveState and approveState reports healthy returns false'
	)
	t.equals(
		isUnhealthy(vtm.notUnhealthy.second),
		false,
		'ApproveState is unhealthy but there is no recent NewState message'
	)
	t.end()
})

// Do for Waiting

tape('isReady()', function(t) {
	t.equals(
		isReady(vtm.ready.first),
		true,
		'Recent Heartbeat messages but no NewState messages returns true'
	)
	t.equals(
		isReady(vtm.notReady.first),
		false,
		'Recent Heartbeat messages and recent NewState message returns false'
	)
	t.equals(
		isReady(vtm.notReady.second),
		false,
		'No NewState and no recent Follower Heartbeat returns false'
	)
	t.equals(
		isReady(vtm.notReady.third),
		false,
		'No NewState and no recent Leader Heartbeat returns false'
	)
	t.end()
})

tape('isActive()', function(t) {
	t.equals(
		isActive(vtm.active.first),
		true,
		"there are recent NewState, ApproveState and Heartbeat's, and the ApproveState reports healthy returns true"
	)
	t.equals(
		isActive(vtm.notActive.first),
		false,
		'recent NewState and Heartbeat but ApproveState reports unhealthy returns false'
	)
	t.equals(
		isActive(vtm.notActive.second),
		false,
		'recent Newstate and ApproveState reports healthy but no recent Heartbeat message returns false'
	)
	t.equals(
		isActive(vtm.notActive.third),
		false,
		'recent NewState and Heartbeat but there is no ApproveState message returns false'
	)
	t.end()
})

tape('isExhausted()', function(t) {
	t.equals(
		isExhausted(vtm.exhausted.first.campaign, vtm.exhausted.first.balanceTree),
		true,
		'balances are more than deposit amount returns true'
	)
	t.equals(
		isExhausted(
			vtm.exhausted.second.campaign,
			vtm.exhausted.second.balanceTree
		),
		true,
		'balances are equal to deposit amount returns true'
	)
	t.equals(
		isExhausted(
			vtm.notExhausted.first.campaign,
			vtm.notExhausted.first.balanceTree
		),
		false,
		'balances are less than deposit amount returns false'
	)
	t.end()
})

tape('isExpired()', function(t) {
	t.equals(
		isExpired(vtm.expired.first.campaign),
		true,
		'validUntil has passed returns true'
	)
	t.equals(
		isExpired(vtm.notExpired.first.campaign),
		false,
		'validUntil has not passed returns false'
	)
	t.end()
})

tape('isWithdraw()', function(t) {
	t.equals(
		isWithdraw(vtm.withdraw.first.campaign),
		true,
		'Campaign with withdrawPeriodStart that has passed returns true'
	)
	t.equals(
		isWithdraw(vtm.notWithdraw.first.campaign),
		false,
		'Campaign with withdrawPeriodStart that has not passed yet returns false'
	)
	t.end()
})

require('./usdEstimation')
require('./getStatusTests')
