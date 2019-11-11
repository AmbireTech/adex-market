const vision = require('@google-cloud/vision')

const webDetection = async imageBuffer => {
	try {
		const client = new vision.ImageAnnotatorClient()
		const [result] = await client.webDetection(imageBuffer)
		return result.webDetection
	} catch (error) {
		console.log(error)
		return false
	}
}

module.exports = { webDetection }
