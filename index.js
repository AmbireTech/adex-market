const ethereumWatcher = require('./ethereum-watcher')
const provider = ethereumWatcher.provider
const db = require('./db')

db.connect().then(() => {
  // TODO: Refactor so calls aren't this long, maybe use class
  ethereumWatcher.crawlChannelList.crawlChannelList()
  // testing to see everything is ok
  ethereumWatcher.crawlChannelList.filterChannelsByStatus('dead').then((res) => console.log(1, res))
  ethereumWatcher.crawlChannelList.getChannelsSortedByUSD().then((res) => console.log(2, res))
  ethereumWatcher.crawlChannelList.getAllChannels().then((res) => console.log(3, res))
  ethereumWatcher.scanAllBlocks(provider)
})
