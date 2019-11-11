const express = require('express')
const { webDetection } = require('../helpers/google/googleVision')
const { classifyWebpage } = require('../helpers/google/googleLanguage')
const { PredefinedTags } = require('adex-models').constants
const multer = require('multer')

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const router = express.Router()

router.get('/', getTags)
router.post('/imageCategories', upload.single('media'), getImageCategories)
router.post('/websiteCategories', getWebsiteCategories)

function getTags (req, res) {
	return res.send(PredefinedTags)
}

async function getImageCategories (req, res) {
	if (req.file) {
		const image = req.file.buffer
		const { pagesWithMatchingImages } = await webDetection(image)
		//TODO: get all matching pages suggestions!
		const categories = await classifyWebpage(pagesWithMatchingImages[0].url)
		return res.json(categories)
	} else {
		console.log('NO FILE ATTACHED!')
	}
}

async function getWebsiteCategories (req, res) {
	console.log('UNDER CONSTRUCTION')
	// TODO: Do website / publisher side
	// const categories = await classifyWebpage(url)
	// return res.json(categories)
}

module.exports = router
