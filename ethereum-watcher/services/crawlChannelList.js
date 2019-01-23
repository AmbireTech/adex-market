const SENTRY_URL = require('../cfg').sentryUrl
const rp = require('request-promise-native')
const convertToUsd = require('../cryptonator/convertToUsd').convertToUsd
const db = require('../../db')

function addCampaignsAndValidatorsToDb (channels) {
  const channelsCol = db.getMongo().collection('campaigns')
  const validatorsCol = db.getMongo().collection('validators')

  const channelsToInsert = channels.map((c) => {
    return channelsCol.updateOne({ _id: c.id }, { $set: c }, { upsert: true })
  })

  const validators = channels.reduce((valArr, c) => {
    c.spec.validators.map((v) => {
      valArr.push(v)
    })
    return valArr
  }, [])

  const validatorsToInsert = validators.map((v) => validatorsCol.updateOne({ _id: v.id }, { $set: v }, { upsert: true }))

  return Promise.all(channelsToInsert, validatorsToInsert)
}

function getChannelsSortedByUSD () {
  return getAllChannels()
    .then((channels) => {
      const channelsPromise = channels.map((c) => {
        return convertToUsd(c.depositAsset, c.depositAmount)
          .then((res) => {
            c['depositInUSD'] = res
            return c
          })
      })
      return Promise.all(channelsPromise).then((results) => {
        return results.sort((a, b) => b.depositInUSD - a.depositInUSD)
      })
    })
}

function getAllChannels () {
  const channelsCol = db.getMongo().collection('campaigns')
  return channelsCol.find().toArray().then((channels) => { return channels })
}

function filterChannelsByStatus (status) {
  return getAllChannels()
    .then((channels) => {
      return channels.filter((channel) => {
        return channel.status === status
      })
    })
}

function getChannelList () {
  rp(`${SENTRY_URL}/channel/list`, { json: true }, (err, res, body) => {
    if (err) {
      return console.error(err)
    }
    addCampaignsAndValidatorsToDb(body.channels)
      .then(() => {
        getAllChannels()
      })
  })
}

function crawlChannelList () {
  getChannelList()
  setInterval(getChannelList, 1000 * 60 * 60) // 1 hour
}

module.exports = { crawlChannelList, getAllChannels, getChannelsSortedByUSD, filterChannelsByStatus }
