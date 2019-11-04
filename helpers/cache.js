function noCache (req, res, next) {
	res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0')
	res.header('Expires', '0')
	res.header('Pragma', 'no-cache')
	next()
}

module.exports = { noCache }
