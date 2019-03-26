const express = require('express')
const tags = require('../tags')

const router = express.Router()

router.get('/tags', getTags)

function getTags (req, res) {
	return res.send(tags)
}

module.exports = router
