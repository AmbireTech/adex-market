const rp = require('request-promise-native')

const options = {
  headers: {
    'User-Agent': 'Request-Promise'
  },
  json: true
}

function convertToUsd (currency, amount) {
  return Promise.resolve(rp(`https://api.cryptonator.com/api/ticker/${currency}-usd`, options))
    .then((res) => {
      return +res.ticker.price * amount
    })
    .catch((err) => {
      console.error(err)
    })
}

module.exports = { convertToUsd }
