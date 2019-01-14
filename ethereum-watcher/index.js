require('dotenv').config()
const provider = require('./ethereum/getProvider')
const scanAllBlocks = require('./ethereum/scanAllBlocks')
const crawlChannelList = require('./services/crawlChannelList')

module.exports = {
  scanAllBlocks: scanAllBlocks,
  crawlChannelList: crawlChannelList,
  provider: provider
}
