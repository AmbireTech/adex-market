const sigUtil = require('eth-sig-util')
const ethereumjs = require('ethereumjs-util')
const { toBuffer, ecrecover, pubToAddress } = ethereumjs
const { arrayify, verifyMessage, solidityKeccak256 } = require('ethers').utils
let { SignatureModes } = require('adex-models').constants

const getAddrFromPersonalSignedMsg = async ({ signature, hash }) => {
	try {
		const hashBytes = arrayify(hash)
		const recoveredAddress = verifyMessage(hashBytes, signature)
		return recoveredAddress
	} catch (err) {
		console.error('err with getting signature')
		return err
	}
}

const getAddrFromEipTypedSignedMsg = async ({ signature, typedData }) => {
	try {
		const user = sigUtil.recoverTypedSignature({
			data: typedData,
			sig: signature,
		})
		return user
	} catch (err) {
		return err
	}
}

const getRsvFromSig = sig => {
	sig = sig.slice(2)

	var r = '0x' + sig.substring(0, 64)
	var s = '0x' + sig.substring(64, 128)
	var v = parseInt(sig.substring(128, 130), 16)

	return { r: r, s: s, v: v }
}

const getAddrFromTrezorSignedMsg = async ({ signature, hash }) => {
	try {
		// TODO: use ethers
		const msg = solidityKeccak256(
			['string', 'bytes32'],
			['\x19Ethereum Signed Message:\n\x20', hash]
		)
		const sig = getRsvFromSig(signature)
		const pubKey = ecrecover(
			toBuffer(msg),
			sig.v,
			toBuffer(sig.r),
			toBuffer(sig.s)
		)
		const addr = '0x' + pubToAddress(pubKey).toString('hex')

		return addr
	} catch (err) {
		return err
	}
}

const getAddrFromSignedMsg = ({ mode, signature, hash, typedData, msg }) => {
	switch (mode) {
		case SignatureModes.GETH:
			// Ledger
			return getAddrFromPersonalSignedMsg({
				signature: signature,
				hash: hash,
				msg: msg,
			})
		case SignatureModes.EIP712:
			// Metamask
			return getAddrFromEipTypedSignedMsg({
				signature: signature,
				typedData: typedData,
			})
		case SignatureModes.TREZOR:
			// Trezor
			// return getAddrFromPersonalSignedMsg({ signature: signature, hash: hash, msg: msg })
			return getAddrFromTrezorSignedMsg({ signature: signature, hash: hash })
		default:
			return Promise.reject(new Error('Invalid signature mode!'))
	}
}
module.exports = {
	getAddrFromSignedMsg: getAddrFromSignedMsg,
}
