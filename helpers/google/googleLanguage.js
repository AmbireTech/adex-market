const language = require('@google-cloud/language')
var request = require('request')

async function classifyWebpage(URL) {
	try {
		const HTML = await getHTMLFromURL(URL)
		const document = {
			content: HTML,
			type: 'HTML',
		}
		const client = new language.LanguageServiceClient()
		return await client.classifyText({ document: document })
	} catch (error) {
		console.log(error.details)
		return [false]
	}
}

async function classifyText(text) {
	try {
		const document = {
			content: text,
			type: 'PLAIN_TEXT',
		}
		const client = new language.LanguageServiceClient()
		return await client.classifyText({ document: document })
	} catch (error) {
		console.log(error.details)
		return [false]
	}
}

function getHTMLFromURL(URL) {
	return new Promise((resolve, reject) => {
		request({ uri: URL }, function(error, response, body) {
			if (error) {
				reject(error)
			} else {
				resolve(body)
			}
		})
	})
}

module.exports = { classifyWebpage, classifyText }
