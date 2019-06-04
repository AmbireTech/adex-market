const { verifyMessage, arrayify } = require('ethers').utils

function verifyLastApproved (lastApproved, validators) {
	if (!lastApproved) {
		return true
	}

	const { newState, approveState } = lastApproved

	const newStateMsg = arrayify('0x' + newState.msg.stateRoot)
	const approveStateMsg = arrayify('0x' + approveState.msg.stateRoot)

	const newStateAddr = verifyMessage(newStateMsg, newState.msg.signature)
	const approveStateAddr = verifyMessage(approveStateMsg, approveState.msg.signature)

	if (newStateAddr === newState.from && approveStateAddr === approveState.from) {
		return doesMsgMatchValidators(newStateAddr, approveStateAddr, validators)
	}
	return false
}

function doesMsgMatchValidators (newStateAddr, approveStateAddr, validators) {
	return newStateAddr === validators[0].id && approveStateAddr === validators[1].id
}

module.exports = { verifyLastApproved }
