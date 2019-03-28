const { Joi } = require('celebrate')
const types = ['legacy_250x250', 'legacy_468x60', 'legacy_336x280', 'legacy_728x90', 'legacy_120x600', 'legacy_160x600']
const ipfsRegex = /(ipfs):\/\/(.){46}?$/
const mimeTypes = ['image/jpeg', 'image/png']

module.exports = {
	adSlot: cfg => ({
		type: Joi.valid(types), // TODO add the other type
		tags: Joi.array().items({
			tag: Joi.string().required(),
			score: Joi.number().min(0).max(100).required()
		}),
		created: Joi.date().timestamp().required(),
		title: Joi.string().max(120).required(),
		description: Joi.string().max(300).required(),
		fallbackMediaUrl: Joi.string().length(53).regex(ipfsRegex).required(),
		fallbackMediaMime: Joi.valid(mimeTypes).required(),
		fallbackTargetUrl: Joi.string().uri().required(),
		archived: Joi.bool().required()
	})
}
