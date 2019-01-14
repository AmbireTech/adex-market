const SENTRY_URL = require('../cfg').sentryUrl
const request = require('request')

function getChannelList () {
  request(`${SENTRY_URL}/channel/list`, { json: true }, (err, res, body) => {
    if (err) {
      return console.error(err)
    }
    console.log(body.channels)
  })
}

function crawlChannelList () {
  getChannelList() // TODO: Remove
  setInterval(getChannelList, 1000 * 60 * 60) // 1 hour
}

module.exports = crawlChannelList
