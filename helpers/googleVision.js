const vision = require('@google-cloud/vision')

export const labelDetection = async image => {
	try {
		const client = new vision.ImageAnnotatorClient()
		const [result] = await client.labelDetection(image)
		return result
	} catch (error) {
		console.log(error)
		return false
	}
}
