const express = require('express')
const { PredefinedTags } = require('adex-models').constants

const router = express.Router()

router.get('/', getTags)
router.post('/gVLabels', getGoogleVisionLabels)

function getTags (req, res) {
	return res.send(PredefinedTags)
}

function getGoogleVisionLabels (req, res) {
	const test = req
	console.log(test)
}

module.exports = router
