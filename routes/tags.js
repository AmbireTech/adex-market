const express = require('express')
const { labelDetection } = require('../helpers/googleVision')
const { PredefinedTags } = require('adex-models').constants
const multer = require('multer')

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const router = express.Router()

router.get('/', getTags)
router.post('/gVLabels', upload.single('media'), getGoogleVisionLabels)

function getTags (req, res) {
	return res.send(PredefinedTags)
}

function getGoogleVisionLabels (req, res) {
	if (req.file) {
		const image = req.file.buffer
		const result = labelDetection(image)
		console.log(result)
	} else {
		console.log('NO FILE ATTACHED!')
	}
}

module.exports = router
