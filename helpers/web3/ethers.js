const ethers = require('ethers')
const ERC20Abi = require('./abi/ERC20.json')

const providerUrl = process.env.WEB3_NODE_URL

const provider = new ethers.providers.JsonRpcProvider(providerUrl)

function getERC20Contract (address) {
	const contract = new ethers.Contract(address, ERC20Abi, provider)
	return contract
}

module.exports = {
	provider,
	ethers,
	getERC20Contract
}
