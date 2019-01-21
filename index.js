const ethereumWatcher = require('./ethereum-watcher')
const provider = ethereumWatcher.provider

ethereumWatcher.crawlChannelList.crawlChannelList()
ethereumWatcher.scanAllBlocks(provider)
