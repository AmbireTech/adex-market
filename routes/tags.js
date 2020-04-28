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
router.post('/getCategories', upload.single('media'), getCategories)

function getTags(req, res) {
	return res.send(PredefinedTags)
}

async function getCategories (req, res) {
	try {
		const { targetUrl } = req.body
		if (req.file) {
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
				classifyWebpage(targetUrl),
				getCategoriesFromLabels(textAnnotations),
				getCategoriesFromLabels(labels),
				getCategoriesFromPage(pagesWithMatchingImages)
			])
			const result = {
				categories: [
					...((targetUlrSuggestions || []).categories || []),
					...((imageTextSuggestions || []).categories || []),
					...((labelsSuggestions || []).categories || []),
					...((matchingPagesSuggestions || []).categories || [])
				]
			}
			return res.json(result)
		} else if (targetUrl) {
			// if only targetUrl provided ( for AdSlot )
			const withHttp = url => !/^https?:\/\//i.test(url) ? `http://${url}` : url
			const [[targetUlrSuggestions]] = await Promise.all([
				classifyWebpage(withHttp(targetUrl))
			])
			const result = {
				categories: [...((targetUlrSuggestions || []).categories || [])]
			}
			return res.json(result)
		} else {
			throw new Error('NO FILE ATTACHED OR URL!')
		}
	} catch (error) {
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
	return results.length > 0 ? Promise.all(results) : [[false]]
}


module.exports = router
