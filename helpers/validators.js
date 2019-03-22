// TODO: Move to constants or new helpers repo
const types = ['legacy_250x250', 'legacy_468x60', 'legacy_336x280', 'legacy_728x90', 'legacy_120x600', 'legacy_160x600']

function isTypeGood (t) {
	return types.includes(t) || t.startsWith('iab_flex_')
}

function isUrl (s) {
	// eslint-disable-next-line no-useless-escape
	var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
	return regexp.test(s)
}

function isIpfsUrl (s) {
	// eslint-disable-next-line no-useless-escape
	return s.startsWith('ipfs://')
}

function validateTags (tags) {
	if (typeof tags !== 'object') {
		return false
	}
	if (tags.length === 0) {
		return false
	}
	const badTags = tags.filter((t) => {
		if (typeof t !== 'object' || !('tag' in t) || !('score' in t)) {
			return true
		}
		if (typeof t.tag !== 'string') {
			return true
		}
		if (typeof t.score !== 'number' || t.score < 0 || t.score > 100) {
			return true
		}
		return false
	})
	// if no tags are caught in the filter this means all tags are ok
	return badTags.length === 0
}

function adUnitValidator (req, res, next) {
	const { type, mediaUrl, targetUrl, targeting, tags } = req.body
	const isTypeOk = isTypeGood(type)
	const isUrlOk = isUrl(targetUrl)
	const isTargetingOk = targeting ? validateTags(targeting) : true // because it's optional
	const areTagsOk = validateTags(tags)
	const isMediaUrlOk = isIpfsUrl(mediaUrl)

	if (isTypeOk && isUrlOk && isTargetingOk && areTagsOk && isMediaUrlOk) {
		return next()
	}
	return res.status(403).send({ error: 'invalid data' })
}

function adSlotValidator (req, res, next) {
	const { type, fallbackMediaUrl, fallbackTargetUrl, tags } = req.body
	const isTypeOk = isTypeGood(type)
	const isMediaUrlOk = isIpfsUrl(fallbackMediaUrl)
	const isUrlOk = isUrl(fallbackTargetUrl)
	const areTagsOk = validateTags(tags)

	if (isTypeOk && isUrlOk && areTagsOk && isMediaUrlOk) {
		return next()
	}
	return res.status(403).send({ error: 'invalid data' })
}

module.exports = { adUnitValidator, adSlotValidator }
