const watcher = require('./ethereum-watcher')

const db = require('./db')

db.connect().then(() => {
  // De facto discovery loop, rename if necessary
  watcher.crawlChannelList()
  // testing to see everything is ok
  watcher.filterChannelsByStatus('dead').then((res) => console.log(1, res))
  watcher.filterChannelsByStatus('live').then((res) => console.log(1.5, res))
  watcher.getChannelsSortedByUSD().then((res) => console.log(2, res))
  watcher.getAllChannels().then((res) => console.log(3, res))
  watcher.scanAllBlocks(watcher.provider)
})
