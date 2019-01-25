const express = require('express')
const db = require('../db')

const router = express.Router()

router.get('/', getStats)

function getStats (req, res, next) {

}

module.exports = router
