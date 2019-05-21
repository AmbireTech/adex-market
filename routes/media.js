const express = require('express')
const multer = require('multer')
const addDataToIpfs = require('../helpers/ipfs')

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const router = express.Router()

router.post('/', upload.single('media'), postMedia)

async function postMedia (req, res, next) {
	return addDataToIpfs(req.file.buffer)
		.then((hash) => {
			return res.json({ ipfs: hash })
		})
		.catch((err) => {
			console.error('Error adding media', err)
			return res.status(500).send(err)
		})
}

module.exports = router
