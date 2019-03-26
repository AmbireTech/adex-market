const express = require('express')
const ipfs = require('../helpers/ipfs')

const router = express.Router()

router.post('/', postMedia)

function postMedia (req, res, next) {
	const { media } = req.body
	return ipfs.addFileToIpfs(media)
		.then((hash) => {
			return res.status(200).send({ ipfs: hash })
		})
		.catch((err) => {
			console.error('error posting media', err)
			return res.status(403)
		})
}

module.exports = router
