const getTransactionsInfo = require('./getTransactionsInfo')

function scanAllBlocks (provider) {
  getTransactionsInfo(provider)
    .then((info) => {
      console.log(getTopicsFromInfo(info))
    })
}

function getTopicsFromInfo (info) {
  return info.transactionReceipts.map((r) => {
    if (r.logs[0]) {
      return r.logs[0].topics.slice(1).map(t => t)[0]
    }
  })
}

module.exports = scanAllBlocks
