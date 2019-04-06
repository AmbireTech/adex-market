const tape = require('tape')
const { isInitializing, isOffline, isDisconnected, isInvalid, isUnhealthy, isReady, isActive, isExhausted, isExpired } = require('../lib/getStatus')
const vmt = require('./validatorTestMessages')

console.log('korrrr')

tape('isInitializing()', function (t) {
	t.equals(isInitializing(vmt.initializing.first), true, 'two empty message arrays return true')
	t.equals(isInitializing(vmt.initializing.second), true, 'firt message array empty return true')
	t.equals(isInitializing(vmt.initializing.third), true, 'second message array empty return true')
	t.equals(isInitializing(vmt.notInitializing.first), false, 'two arrays with messages return false')
	t.end()
})

tape('isOffline()', function (t) {
	t.equals(isOffline(vmt.offline.first), true, 'Two messages with not recent heartbeat messages return true')
	t.equals(isOffline(vmt.offline.second), true, 'When first message has recent heartbeat timestamp but second hasn\'t return true')
	t.equals(isOffline(vmt.offline.third), true, 'When second message has recent heartbeat timestamp but first hasn\'t return true')
	t.equals(isOffline(vmt.notOffline.first), false, 'When both messages have a heartbeat with recent timestamp return false')
	t.end()
})

tape('isDisconnected()', function (t) {
	t.equals(isDisconnected(vmt.disconnected.first), true, 'Majority of messages not matching returns true')
	t.equals(isDisconnected(vmt.disconnected.second), true, '50% of messages not matching returns true')
	t.equals(isDisconnected(vmt.notDisconnected.first), false, 'more than 50% of messages matching returns false')
	t.end()
})

tape('isInvalid()', function (t) {
	t.equals(isInvalid(vmt.invalid.first), true, 'Recent NewState messages but follower does not propagate approveState returns true')
	t.equals(isInvalid(vmt.notInvalid.first), false, 'Recent NewState messages and follower propagates approveState returns false')
	t.equals(isInvalid(vmt.notInvalid.second), false, 'Follower does not propagate approveState but one of the NewState messages isn\'t recent returns false')
	t.equals(isInvalid(vmt.notInvalid.third), false, 'ApproveState but no recent NewState returns false')
	t.equals(isInvalid(vmt.notInvalid.fourth), false, '0 NewState messages and no ApproveState returns false')
	t.end()
})

tape('isUnhealthy()', function (t) {
	t.equals(isUnhealthy(vmt.unhealthy.first), true, 'Recent NewState and approveState but approveState reports unhealthy returns true')
	t.equals(isUnhealthy(vmt.notUnhealthy.first), false, 'Recent NewState and approveState and approveState reports healthy returns false')
	t.equals(isUnhealthy(vmt.notUnhealthy.second), false, 'No recent Heartbeat returns false')
	t.end()
})

tape('isReady()', function (t) {
	t.equals(isReady(vmt.ready.first), true, 'Recent Heartbeat messages but no NewState messages returns true')
	t.equals(isReady(vmt.notReady.first), false, 'One message has no recent Heartbeat and both messages have NewState returns false')
	t.equals(isReady(vmt.notReady.second), false, 'No NewState but one message has no recent HeartBeat returns false')
	t.equals(isReady(vmt.notReady.third), false, 'Recent NewState messages but no Heartbeats returns false')
	t.end()
})

tape('isActive()', function (t) {
	t.equals(isActive(vmt.active.first), true, 'there are recent NewState, ApproveState and Heartbeat\'s, and the ApproveState reports healthy returns true')
	t.equals(isActive(vmt.notActive.first), false, 'recent NewState and Heartbeat but ApproveState reports unhealthy returns false')
	t.equals(isActive(vmt.notActive.second), false, 'recent Newstate and ApproveState reports healthy but no recent Heartbeat message returns false')
	t.equals(isActive(vmt.notActive.third), false, 'recent NewState and Heartbeat but there is no ApproveState message returns false')
	t.end()
})

tape('isExhausted()', function (t) {
	t.equals(isExhausted(vmt.exhausted.first.campaign, vmt.exhausted.first.balanceTree), true, 'balances are more than deposit amount returns true')
	t.equals(isExhausted(vmt.exhausted.second.campaign, vmt.exhausted.second.balanceTree), true, 'balances are equal to deposit amount returns true')
	t.equals(isExhausted(vmt.notExhausted.first.campaign, vmt.notExhausted.first.balanceTree), false, 'balances are less than deposit amount returns false')
	t.end()
})

tape('isExpired()', function (t) {
	t.equals(isExpired(vmt.expired.first), true, 'validUntil has passed returns true')
	t.equals(isExpired(vmt.notExpired.first), false, 'validUntil has not passed returns false')
	t.end()
})
