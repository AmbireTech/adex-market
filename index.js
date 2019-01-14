require('dotenv').config()
// const connectToContract = require('./ethereum/connectToContract')
const provider = require('./ethereum/getProvider')
const scanAllBlocks = require('./ethereum/scanAllBlocks')
const crawlChannelList = require('./services/crawlChannelList')

scanAllBlocks(provider)
crawlChannelList()

// const contract = connectToContract(provider)
