const ethers = require('ethers')
const cfg = require('../cfg')

let provider = new ethers.providers.EtherscanProvider('kovan', cfg.etherscanAPIKey)

module.exports = provider
