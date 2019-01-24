require('dotenv').config()
const crawlChannelList = require('./services/crawlChannelList')

class EthereumWatcher {
  constructor () {
    this.crawlChannelList = crawlChannelList.crawlChannelList
    this.getAllChannels = crawlChannelList.getAllChannels
    this.filterChannelsByStatus = crawlChannelList.filterChannelsByStatus
    this.getChannelsSortedByUSD = crawlChannelList.getChannelsSortedByUSD
  }
}

const watcher = new EthereumWatcher()

module.exports = watcher
