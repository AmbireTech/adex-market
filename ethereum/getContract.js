const ethers = require('ethers')
const cfg = require('../cfg')

function connectToContract (provider) {
  let contract = new ethers.Contract(cfg.contractAddress, cfg.contractAbi, provider)
  return contract
}

module.exports = connectToContract
