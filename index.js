const ethereumWatcher = require('./ethereum-watcher')
const provider = ethereumWatcher.provider

ethereumWatcher.crawlChannelList()
ethereumWatcher.scanAllBlocks(provider)
