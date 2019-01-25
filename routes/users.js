const express = require('express')
const db = require('../db')

const router = express.Router()

router.post('/', postUser)
router.get('/list', getUserList)

function postUser (req, res, next) {

}

function getUserList (req, res, next) {
  
}

module.exports = router
