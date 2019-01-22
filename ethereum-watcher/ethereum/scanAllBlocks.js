const getReceipts = require('./getTransactionsInfo')

function scanAllBlocks (provider) {
  getReceipts(provider)
    .then((receiptsPromise) => {
      Promise.all(receiptsPromise)
        .then((receipts) => {
          // console.log(getTopicsFromReceipt(receipts))
        })
    })
}

function getTopicsFromReceipt (receipts) {
  return receipts.reduce((result, receipt) => {
    if (receipt && receipt.logs[0]) {
      result.push(receipt.logs[0].topics.slice(1).map(t => t)[0])
    }
    return result
  }, [])
}

module.exports = scanAllBlocks
