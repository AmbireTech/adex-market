const express = require('express')
const ipfs = require('../helpers/ipfs')

const router = express.Router()

router.post('/', postMedia)

function postMedia (req, res, next) {
	const { media } = req.body
	return ipfs.addFileToIpfs(media)
		.then((hash) => {
			return { ipfs: hash }
		})
}

module.exports = router
