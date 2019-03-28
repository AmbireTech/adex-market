const sigUtil = require('eth-sig-util')
const ethereumjs = require('ethereumjs-util')
const { toBuffer, ecrecover, pubToAddress } = ethereumjs
const { web3Utils } = require('./ADX')
const { ethers } = require('./ethers')
let { SIGN_TYPES } = require('adex-constants').exchange

const getAddrFromPersonalSignedMsg = async ({ signature, hash }) => {
	try {
		const hashBytes = ethers.utils.arrayify(hash)
		const recoveredAddress = ethers.utils.verifyMessage(hashBytes, signature)
		return recoveredAddress
	} catch (err) {
		console.log('err with getting signature')
		return err
	}
}

const getAddrFromEipTypedSignedMsg = async ({ signature, typedData }) => {
	try {
		const user = sigUtil.recoverTypedSignature({
			data: typedData,
			sig: signature
		})
		return user
	} catch (err) {
		return err
	}
}

const getRsvFromSig = (sig) => {
	sig = sig.slice(2)

	var r = '0x' + sig.substring(0, 64)
	var s = '0x' + sig.substring(64, 128)
	var v = parseInt(sig.substring(128, 130), 16)

	return { r: r, s: s, v: v }
}

const getAddrFromTrezorSignedMsg = async ({ signature, hash }) => {
	try {
		// TODO: use ethers
		const msg = web3Utils.soliditySha3('\x19Ethereum Signed Message:\n\x20', hash)
		console.log('msg', msg)
		const sig = getRsvFromSig(signature)
		const pubKey = ecrecover(toBuffer(msg), sig.v, toBuffer(sig.r), toBuffer(sig.s))
		const addr = '0x' + pubToAddress(pubKey).toString('hex')

		return addr
	} catch (err) {
		return err
	}
}

// TODO Figure out what to do with typedData
const getAddrFromSignedMsg = ({ mode, signature, hash, typedData, msg }) => {
	switch (mode) {
	case SIGN_TYPES.EthPersonal.id:
		// Ledger
		return getAddrFromPersonalSignedMsg({ signature: signature, hash: hash, msg: msg })
	case SIGN_TYPES.Eip.id:
		// Metamask
		return getAddrFromEipTypedSignedMsg({ signature: signature, typedData: typedData })
	case SIGN_TYPES.Trezor.id:
		// Trezor
		// return getAddrFromPersonalSignedMsg({ signature: signature, hash: hash, msg: msg })
		return getAddrFromTrezorSignedMsg({ signature: signature, hash: hash })
	default:
		return Promise.reject(new Error('Invalid signature mode!'))
	}
}
module.exports = {
	getAddrFromSignedMsg: getAddrFromSignedMsg
}
