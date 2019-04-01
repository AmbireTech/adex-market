const Web3 = require('web3')
const web3Utils = Web3.utils

const url = process.env.WEB3_NODE_URL

let provider = new Web3.providers.HttpProvider(url)
let web3 = new Web3(provider)

module.exports = {
	web3: web3,
	web3Utils: web3Utils
}
