const url = require('url')
const fetch = require('node-fetch')
const AWIS_KEY = process.env.AWIS_KEY
const { constants } = require('adex-models')
const { compareTwoStrings } = require('string-similarity')
const TAG_SIMILARITY_NEEDED = 0.75

const SHORT_STRING_SIMILARITY = 0.75
const MEDIUM_STRING_SIMILARITY = 0.66
const LONG_STRING_SIMILARITY = 0.5

async function getCategoriesFromAlexa(website) {
	if (!AWIS_KEY) return null
	const { hostname } = url.parse(website)
	const resp = await fetch(
		`https://awis.api.alexa.com/api?Action=UrlInfo&Output=json&ResponseGroup=Categories&Url=${hostname}`,
		{
			headers: { 'x-api-key': AWIS_KEY },
		}
	)
	const { Awis } = await resp.json()
	const categories = Awis.Results.Result.Alexa.Related.Categories
	return categories
}

function simpleMatchCheck(tag, category) {
	return compareTwoStrings(tag, category) >= TAG_SIMILARITY_NEEDED
}

// Experimental function
// eslint-disable-next-line no-unused-vars
function advancedMatchCheck(tag, category) {
	// check for substrings
	// needed to catch cases like "Search Engines" which is a logical match with "Shopping Portals and Search Engines" but has low similarity
	// size limit because short categories like "Git" will match with "Photographic & diGITal Arts
	if (tag.includes(category) && category.length > 5) {
		return true
	}
	if (category.includes(tag) && tag.length > 5) {
		return true
	}

	const averageLength = (tag.length + category.length) / 2

	// assuming if the strings are long, they can be similar but lower similarity will be detected
	switch (averageLength) {
		case averageLength <= 10:
			return compareTwoStrings(tag, category) >= SHORT_STRING_SIMILARITY
		case averageLength <= 15:
			return compareTwoStrings(tag, category) >= MEDIUM_STRING_SIMILARITY
		default:
			return compareTwoStrings(tag, category) >= LONG_STRING_SIMILARITY
	}
}

function getTagsFromCategories(categories) {
	const categoryTitles = categories.map(c => c.toLowerCase())
	const tags = constants.PredefinedTags.map(t => t._id)

	// If a category is similar to a tag but not an exact match ex. "Media & Entertainment" vs "Media and Entertainment"
	//it will add a new tag instead of using the original one, so we have to look for string similarity
	const matchingTags = tags.filter(t => {
		return categoryTitles.some(c => simpleMatchCheck(t, c))
	})
	const matches = [...categoryTitles, ...matchingTags]
	return matches
}

function getDirNameFromCategory(category) {
	const pathArr = category.AbsolutePath.split('/')
	const pathWithoutLast = pathArr.slice(0, pathArr.length - 1)
	const directoryName = pathWithoutLast.join('/')
	return directoryName
}

async function getAdditionalCategories(categories) {
	const { CategoryData } = categories
	const directoriesToBrowse = CategoryData.map(getDirNameFromCategory)
	const allRequests = directoriesToBrowse.map(d => {
		const requestURL = `https://awis.api.alexa.com/api?Action=CategoryBrowse&Output=json&Descriptions=False&Path=${d}&ResponseGroup=Categories,RelatedCategories`
		return fetch(requestURL, {
			headers: { 'x-api-key': AWIS_KEY },
		})
	})
	const responseData = await Promise.all(allRequests)
	const responseDataParsed = await Promise.all(responseData.map(r => r.json()))
	const additionalCategories = responseDataParsed.map(d => {
		const categories = d.Awis.Results.Result.Alexa.CategoryBrowse.Categories.Category.map(
			c => c.Title
		)
		const relatedCategories = d.Awis.Results.Result.Alexa.CategoryBrowse.RelatedCategories.Category.map(
			c => c.Title
		)
		const allCategories = [...categories, ...relatedCategories]
		return allCategories
	})
	const flattenedCategories = additionalCategories.reduce((all, c) => {
		return all.concat(c)
	})
	return flattenedCategories
}

async function categorizeAdSlot(adSlot) {
	const { website } = adSlot
	const initialCategories = await getCategoriesFromAlexa(website)
	const allCategories = await getAdditionalCategories(initialCategories)
	const tags = getTagsFromCategories(allCategories)
	return tags
}

module.exports = categorizeAdSlot
