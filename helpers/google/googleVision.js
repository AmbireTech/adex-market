const vision = require('@google-cloud/vision')

// https://googleapis.dev/nodejs/vision/latest/v1.ImageAnnotatorClient.html#annotateImage
// annotateImage() returns everything but I was not able to run it
// I believe there is a bug there in the package as when you pass
// buffer it throws an error.

async function webDetection(imageBuffer) {
	const client = new vision.ImageAnnotatorClient()
	const [result] = await client.webDetection(imageBuffer)
	return result.webDetection
}

async function labelDetection(imageBuffer) {
	const client = new vision.ImageAnnotatorClient()
	const [result] = await client.labelDetection(imageBuffer)
	return result.labelAnnotations
}

async function textDetection(imageBuffer) {
	const client = new vision.ImageAnnotatorClient()
	const [result] = await client.textDetection(imageBuffer)
	return result.textAnnotations
}

module.exports = { webDetection, labelDetection, textDetection }
