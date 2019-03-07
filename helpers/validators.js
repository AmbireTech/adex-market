const types = ['legacy_250x250', 'legacy_468x60', 'legacy_336x280', 'legacy_728x90', 'legacy_120x600', 'legacy_160x600']

function isUrl (s) {
	// eslint-disable-next-line no-useless-escape
	var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
	return regexp.test(s)
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
	const { type, targetUrl, targetingTag, tags } = req.body
	const isTypeOk = !types.includes(type)
	const isUrlOk = isUrl(targetUrl)
	const isTargetingOk = targetingTag ? validateTags(targetingTag) : true // because it's optional
	const areTagsOk = validateTags(tags)

	if (isTypeOk && isUrlOk && isTargetingOk && areTagsOk) {
		return next()
	}
	return res.status(403).send('invalid data')
}

function adSlotValidator (req, res, next) {
	const { type, fallbackTargetUrl, tags } = req.body
	const isTypeOk = !types.includes(type)
	const isUrlOk = isUrl(fallbackTargetUrl)
	const areTagsOk = validateTags(tags)

	if (isTypeOk && isUrlOk && areTagsOk) {
		return next()
	}
	return res.status(403).send('invalid data')
}

module.exports = { adUnitValidator, adSlotValidator }
