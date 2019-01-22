const SENTRY_URL = require('../cfg').sentryUrl
const rp = require('request-promise-native')
const convertToUsd = require('../cryptonator/convertToUsd').convertToUsd
const db = require('../../db')

function addChannelsToDb (channels) {
  const channelsCol = db.getMongo().collection('channels')
  const channelsToInsert = channels.map((c) => {
    return channelsCol.updateOne({ _id: c.id }, { $set: c }, { upsert: true })
  })

  return Promise.all(channelsToInsert)
}

function sortByUsd (channels) {
  return channels.sort((a, b) => a.depositInUSD > b.depositInUSD)
}

// TODO: Maybe add USD price during crawling so this is not executed every call
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
        return sortByUsd(results)
      })
    })
}

function getAllChannels () {
  const channelsCol = db.getMongo().collection('channels')
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
    addChannelsToDb(body.channels)
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
