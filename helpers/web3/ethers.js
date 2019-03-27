const ethers = require('ethers')

const providerUrl = process.env.WEB3_NODE_URL

const provider = new ethers.providers.JsonRpcProvider(providerUrl)

module.exports = {
	provider,
	ethers
}
