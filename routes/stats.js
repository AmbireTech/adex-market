const express = require('express')
const db = require('../db')
const getRequest = require('../helpers/getRequest')

const router = express.Router()

router.get('/', getStats)

function getActiveUsers (users, role) {
  return users.filter((u) => u.role === role).length
}

function getAnonUsers (campaigns, users) {
  campaigns.map((c) => {
    getRequest(`${c.spec.validators[0].url}/channels/${c.id}/tree`)
      .then((result) => {
        // TODO:
        // check result.balances for users
        // check if each user exists in users
        // if not add him as anon to his according role
      })
  })
}

function getData () {
  const usersCol = db.getMongo().collection('users')
  const campaignsCol = db.getMongo().collection('campaigns')

  const getDataFromUsers = usersCol
    .find()
    .toArray()
    .then((result) => {
      return result
    })

  const getDataFromCampaigns = campaignsCol
    .find()
    .toArray()
    .then((result) => {
      return result
    })

  return Promise.all([getDataFromUsers, getDataFromCampaigns])
}

function getStats (req, res, next) {
  const output = {
    publisherCount: 0,
    advertiserCount: 0,
    anonPublisherCount: 0,
    anonAdvertiserCount: 0,
    campaignCount: 0,
    campaignsByStatus: {},
    totalSpentFundsByAssetType: {}
  }

  getData()
    .then((result) => {
      const users = result[0]
      const campaigns = result[1]

      output.publisherCount = getActiveUsers(users, 'publisher')
      output.advertiserCount = getActiveUsers(users, 'advertiser')

      // getAnonUsers(campaigns, users)
      output.campaignCount = campaigns.length

      campaigns.map((c) => {
        if (!output.campaignsByStatus[c.status]) {
          output.campaignsByStatus[c.status] = 1
        }
        if (!output.totalSpentFundsByAssetType[c.depositAsset]) {
          output.totalSpentFundsByAssetType[c.depositAsset] = c.depositAmount
        }

        output.totalSpentFundsByAssetType[c.depositAsset] += c.depositAmount
        output.campaignsByStatus[c.status]++
      })

      res.send(output)
    })
}

module.exports = router
