const ethers = require('ethers')
const cfg = require('../cfg')

function getContract (provider) {
  let contract = new ethers.Contract(cfg.contractAddress, cfg.contractAbi, provider)
  return contract
}

module.exports = getContract
