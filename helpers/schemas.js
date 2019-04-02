const { Joi } = require('celebrate')
const types = ['legacy_250x250', 'legacy_468x60', 'legacy_336x280', 'legacy_728x90', 'legacy_120x600', 'legacy_160x600']
const ipfsRegex = /(ipfs):\/\/(.){46}?$/
const mimeTypes = ['image/jpeg', 'image/png']
const addressRegex = /^0x[0-9A-Fa-f]{40}$/
const signatureRegex = /^0x[0-9A-Fa-f]{130}$/
const hashRegex = /^0x[0-9A-Fa-f]{64}$/
const typeRegex = /^iab_flex_.{1,}/
const validModes = [0, 1, 2]
const roles = ['advertiser', 'publisher']

module.exports = {
	adSlotPost: {
		type: Joi.string().regex(typeRegex).allow(types).required(),
		tags: Joi.array().items({
			tag: Joi.string().required(),
			score: Joi.number().min(0).max(100).required()
		}).required(),
		created: Joi.date().timestamp().required(),
		title: Joi.string().max(120).required(),
		description: Joi.string().max(300).required(),
		fallbackMediaUrl: Joi.string().length(53).regex(ipfsRegex).required(),
		fallbackMediaMime: Joi.string().valid(mimeTypes).required(),
		fallbackTargetUrl: Joi.string().uri().required(),
		archived: Joi.bool().optional(),
		modified: Joi.allow(null)
	},
	adUnitPost: {
		type: Joi.string().regex(typeRegex).allow(types).required(),
		mediaUrl: Joi.string().length(53).regex(ipfsRegex).required(),
		mediaMime: Joi.string().valid(mimeTypes).required(),
		targetUrl: Joi.string().uri().required(),
		targeting: Joi.array().items({
			tag: Joi.string().required(),
			score: Joi.number().min(0).max(100).required()
		}).optional(),
		tags: Joi.array().items({
			tag: Joi.string().required(),
			score: Joi.number().min(0).max(100).required()
		}).required(),
		created: Joi.date().timestamp().required(),
		title: Joi.string().max(120).required(),
		description: Joi.string().max(300).required(),
		archived: Joi.bool().optional(),
		modified: Joi.allow(null)
	},
	user: {
		identity: Joi.string().regex(addressRegex).required(),
		mode: Joi.number().valid(validModes).required(),
		signature: Joi.string().regex(signatureRegex).required(),
		hash: Joi.string().regex(hashRegex).required(),
		authToken: Joi.string().required(),
		signerAddress: Joi.string().regex(addressRegex).required(),
		prefixed: Joi.boolean().optional(),
		typedData: Joi.array().items({
			type: Joi.string().required(),
			name: Joi.string().required(),
			value: Joi.string().required()
		}).optional(),
		role: Joi.string().valid(roles).optional()
	}
}
