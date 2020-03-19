const url = require('url')
const fetch = require('node-fetch')
const AWIS_KEY = process.env.AWIS_KEY
const { constants } = require('adex-models')
const { compareTwoStrings } = require('string-similarity')
const TAG_SIMILARITY_NEEDED = 0.9

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

function getTagsFromCategories(categories) {
	const categoryTitles = categories.map(c => c.toLowerCase())
	const tags = constants.PredefinedTags.map(t => t._id)

	const nonMatchingCategories = categoryTitles.filter(c => {
		return tags.some(t => compareTwoStrings(t, c) < TAG_SIMILARITY_NEEDED)
	})

	// If a category is similar to a tag but not an exact match ex. "Media & Entertainment" vs "Media and Entertainment"
	//it will add a new tag instead of using the original one, so we have to look for string similarity
	const matchingTags = tags.filter(t => {
		return categoryTitles.some(
			c => compareTwoStrings(t, c) >= TAG_SIMILARITY_NEEDED
		)
	})
	const matches = [...nonMatchingCategories, ...matchingTags]
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
	console.log(tags)
	return tags
}

module.exports = categorizeAdSlot
