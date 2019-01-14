const cfg = require('../cfg')

const transactionsInfo = {
  transactions: [],
  transactionReceipts: []
}

let history

function getTransactionsInfo (provider) {
  return provider.getHistory(cfg.contractAddress)
    .then((h) => {
      history = h
      return Promise.all(getTransactions(provider))
    })
    .then((res) => {
      return Promise.all(getReceipts(provider))
    })
    .then((res) => {
      return transactionsInfo
    })
}

function getTransactions (provider) {
  return history.map((h) => {
    return provider.getTransaction(h.hash)
      .then((t) => {
        transactionsInfo.transactions.push(t)
      })
  })
}

function getReceipts (provider) {
  return history.map((h) => {
    return provider.getTransactionReceipt(h.hash)
      .then((tr) => {
        transactionsInfo.transactionReceipts.push(tr)
      })
  })
}

module.exports = getTransactionsInfo
