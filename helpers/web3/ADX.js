// TODO: Clean up
const Web3 = require('web3')
const web3Utils = Web3.utils

let url

if (process.env.NODE_ENV === 'production') {
	url = `https://mainnet.infura.io/v3/${process.env.API_KEY}`
} else {
	url = `https://goerli.infura.io/v3/${process.env.API_KEY}`
}

let provider = new Web3.providers.HttpProvider(url)
let web3 = new Web3(provider)

module.exports = {
	web3: web3,
	web3Utils: web3Utils
}
