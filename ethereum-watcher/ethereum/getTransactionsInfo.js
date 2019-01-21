const cfg = require('../cfg')

function getReceipts (provider) {
  return provider.getHistory(cfg.contractAddress)
    .then((history) => {
      return history.map((historyItem) => {
        return provider.getTransactionReceipt(historyItem.hash)
          .then((tr) => {
            return tr
          })
          .catch(err => console.error(err))
      })
    })
}

module.exports = getReceipts
