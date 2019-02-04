const getRequest = require('../../helpers/getRequest')

function convertToUsd (currency, amount) {
  return Promise.resolve(getRequest(`https://api.cryptonator.com/api/ticker/${currency}-usd`))
    .then((res) => {
      return +res.ticker.price * amount
    })
    .catch((err) => {
      console.error(err)
    })
}

module.exports = { convertToUsd }
