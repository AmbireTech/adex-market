const express = require('express')
const {
	webDetection,
	labelDetection,
	textDetection
} = require('../helpers/google/googleVision')
const {
	classifyWebpage,
	classifyText
} = require('../helpers/google/googleLanguage')
const { PredefinedTags } = require('adex-models').constants
const multer = require('multer')

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const router = express.Router()

const MINIMUM_WORDS_NEEDED = 20

router.get('/', getTags)
router.post('/imageCategories', upload.single('media'), getImageCategories)
router.post('/websiteCategories', getWebsiteCategories)

function getTags (req, res) {
	return res.send(PredefinedTags)
}

async function getImageCategories (req, res) {
	try {
		if (req.file) {
			const { targetUrl } = req.body
			const image = req.file.buffer
			const [
				{ pagesWithMatchingImages },
				textAnnotations,
				labels
			] = await Promise.all([
				webDetection(image),
				textDetection(image),
				labelDetection(image)
			])
			const [
				[targetUlrSuggestions],
				[imageTextSuggestions],
				[labelsSuggestions],
				[[matchingPagesSuggestions]]
			] = await Promise.all([
				classifyWebpage(targetUrl).catch(e => {
					console.log('Did not receive categories from target url')
					return [null]
				}),
				getCategoriesFromLabels(textAnnotations).catch(e => {
					console.log('Did not receive categories from image text')
					return [null]
				}),
				getCategoriesFromLabels(labels).catch(e => {
					console.log('Did not receive categories from labels')
					return [null]
				}),
				getCategoriesFromPage(pagesWithMatchingImages).catch(e => {
					console.log('Did not receive categories from matching pages')
					return [[null]]
				})
			])
			const result = {
				categories: [
					...(targetUlrSuggestions || []).categories,
					...(imageTextSuggestions || []).categories,
					...(labelsSuggestions || []).categories,
					...(matchingPagesSuggestions || []).categories
				]
			}
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
	let enoughWords = []
	while (enoughWords.length < MINIMUM_WORDS_NEEDED && results.length !== 0) {
		enoughWords = enoughWords.concat(results)
	}
	return classifyText(enoughWords.join(' '))
}

async function getCategoriesFromPage (pagesWithMatchingImages) {
	const results = []
	pagesWithMatchingImages &&
    pagesWithMatchingImages.map(match => {
    	results.push(classifyWebpage(match.url))
    })
	return Promise.all(results)
}

async function getWebsiteCategories (req, res) {
	console.log('UNDER CONSTRUCTION')
	// TODO: Do website / publisher side
	// const categories = await classifyWebpage(url)
	// return res.json(categories)
}

module.exports = router
