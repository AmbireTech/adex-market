
const language = require('@google-cloud/language')
var request = require('request')

const classifyWebpage = async (URL) => {
	try {
		const HTML = await getHTMLFromURL(URL)
		const document = {
			content: HTML,
			type: 'HTML'
		}
		const client = new language.LanguageServiceClient()
		return await client.classifyText({ document: document })
	} catch (error) {
		console.log(error)
		return [false]
	}
}

const classifyText = async (text) => {
	try {
		const document = {
			content: text,
			type: 'PLAIN_TEXT'
		}
		const client = new language.LanguageServiceClient()
		return await client.classifyText({ document: document })
	} catch (error) {
		console.log(error)
		return [false]
	}
}

const getHTMLFromURL = (URL) => {
	return new Promise((resolve, reject) => {
		request({ uri: URL },
			function (error, response, body) {
				if (error) {
					reject(error)
				} else {
					resolve(body)
				}
			})
	})
}

module.exports = { classifyWebpage, classifyText }
