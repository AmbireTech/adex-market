require('dotenv').config()
const provider = require('./ethereum/getProvider')
const scanAllBlocks = require('./ethereum/scanAllBlocks')
const crawlChannelList = require('./services/crawlChannelList')

class EthereumWatcher {
  constructor () {
    this.provider = provider
    this.scanAllBlocks = scanAllBlocks
    this.crawlChannelList = crawlChannelList.crawlChannelList
    this.getAllChannels = crawlChannelList.getAllChannels
    this.filterChannelsByStatus = crawlChannelList.filterChannelsByStatus
    this.getChannelsSortedByUSD = crawlChannelList.getChannelsSortedByUSD
  }
}

const watcher = new EthereumWatcher()

module.exports = watcher
