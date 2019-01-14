require('dotenv').config()
const provider = require('./ethereum/getProvider')
const scanAllBlocks = require('./ethereum/scanAllBlocks')
const crawlChannelList = require('./services/crawlChannelList')

scanAllBlocks(provider)
crawlChannelList()
