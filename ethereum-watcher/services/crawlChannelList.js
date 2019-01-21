const SENTRY_URL = require('../cfg').sentryUrl
const rp = require('request-promise-native')
const convertToUsd = require('../cryptonator/convertToUsd').convertToUsd

let channels = []

function sortByDepositInUSD () {
  return channels.sort((a, b) => a.depositInUSD > b.depositInUSD)
}

function getChannelsPriceInUsd () {
  channels = channels.map((c) => {
    return convertToUsd(c.depositAsset, c.depositAmount)
      .then((res) => {
        c['depositInUSD'] = res
        return c
      })
  })
  Promise.all(channels).then((results) => {
    channels = results
  })
}

function getAllChannels () {
  return channels
}

function filterChannelsByStatus (status) {
  return channels.filter((channel) => {
    return channel.status === status
  })
}

function getChannelList () {
  rp(`${SENTRY_URL}/channel/list`, { json: true }, (err, res, body) => {
    if (err) {
      return console.error(err)
    }
    channels = body.channels
    getChannelsPriceInUsd()
  })
}

function crawlChannelList () {
  getChannelList()
  setInterval(getChannelList, 1000 * 60 * 60) // 1 hour
}

module.exports = { crawlChannelList, getAllChannels, filterChannelsByStatus, sortByDepositInUSD }
