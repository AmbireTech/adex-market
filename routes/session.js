const express = require('express')
const router = express.Router()

router.get('/', checkSession)

function checkSession(req, res) {
	if (req.identity) {
		return res.send(JSON.stringify({ authenticated: true }))
	} else {
		return res.status(403).send({ error: 'Authentication required' })
	}
}

module.exports = router
