const express = require('express')
const db = require('../db')

const router = express.Router()

router.get('/', getCampaigns)
router.get('/:id', getCampaignInfo)

function getCampaigns (req, res, next) {
  const limit = +req.query.limit || 100
  const skip = +req.query.skip || 0
  const status = req.query.status ? req.query.status.split(',') : ['Active', 'Ready']

  const campaignsCol = db.getMongo().collection('campaigns')

  return campaignsCol
    .find({ 'status': { $in: status } })
    .skip(skip)
    .limit(limit)
    .toArray()
    .then((result) => {
      res.send(result)
    })
}

function getCampaignInfo (req, res, next) {
  const id = req.params.id
  const campaignsCol = db.getMongo().collection('campaigns')

  return campaignsCol
    .find({ '_id': id })
    .toArray()
    .then((result) => {
      res.send(result)
    })
}

module.exports = router
