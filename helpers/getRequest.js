const rp = require('request-promise-native')

const options = {
  headers: {
    'User-Agent': 'Request-Promise'
  },
  json: true
}

function getRequest (uri) {
  return rp(uri, options)
}

module.exports = getRequest
