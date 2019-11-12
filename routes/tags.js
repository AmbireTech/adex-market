const express = require('express')
const { webDetection, labelDetection } = require('../helpers/google/googleVision')
const { classifyWebpage, classifyText } = require('../helpers/google/googleLanguage')
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
	try {
		if (req.file) {
			const image = req.file.buffer
			const { pagesWithMatchingImages, webEntities } = await webDetection(image)
			const labels = await labelDetection(image)
			const labelsCategories = await getCategoriesFromLabels(labels) || []
			const entitiesCategories = await getCategoriesFromLabels(webEntities) || []
			const pagesCategories = await getCategoriesFromPage(pagesWithMatchingImages) || []
			const result = { categories: [...entitiesCategories, ...pagesCategories, ...labelsCategories] }
			return res.json(result)
		} else {
			throw new Error('NO FILE ATTACHED!')
		}
	} catch (error) {
		console.error('Error getting category suggestions', error)
		return res.status(500).send(error.toString())
	}
}

async function getCategoriesFromLabels (labels) {
	const results = []
	labels && labels.map(i => i.description && results.push(i.description))
	const { categories } = await classifyText(results.join(', '))
	return categories
}

async function getCategoriesFromPage (pagesWithMatchingImages) {
	const results = []
	pagesWithMatchingImages &&
			pagesWithMatchingImages.map(match => {
				results.push(classifyWebpage(match.url))
			})
	const matchingCategories = await Promise.all(results)
	let unwrap = []
	matchingCategories.map(
		i => (unwrap = unwrap.concat(i.categories))
	)
	return unwrap
}

async function getWebsiteCategories (req, res) {
	console.log('UNDER CONSTRUCTION')
	// TODO: Do website / publisher side
	// const categories = await classifyWebpage(url)
	// return res.json(categories)
}

module.exports = router
