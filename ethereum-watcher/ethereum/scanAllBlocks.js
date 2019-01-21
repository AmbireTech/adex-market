const getReceipts = require('./getTransactionsInfo')

function scanAllBlocks (provider) {
  getReceipts(provider)
    .then((receiptsPromise) => {
      Promise.all(receiptsPromise)
        .then((receipts) => {
          console.log(getTopicsFromReceipt(receipts))
        })
    })
}

function getTopicsFromReceipt (receipts) {
  return receipts.map((r) => {
    if (r && r.logs[0]) {
      return r.logs[0].topics.slice(1).map(t => t)[0]
    }
  })
}

module.exports = scanAllBlocks
