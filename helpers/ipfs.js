const ipfsAPI = require('ipfs-api')
const ipfsHost = process.env.IPFSHOST || 'ipfs.adex.network'
const ipfsPort = process.env.IPFSPORT || '8443'
const ipfsProtocol = process.env.IPFSPROTOCOL || 'https'

const ipfs = ipfsAPI(ipfsHost, ipfsPort, { protocol: ipfsProtocol })

function addFileToIpfs (file) {
	let buffer = Buffer.from(file)
	return ipfs.files.add(buffer)
		.then(function (res) {
			if (res[0]) {
				return res[0].hash
			} else {
				throw new Error('Error adding data to ipfs')
			}
		})
		.then((hash) => {
			return ipfs.pin.add(hash)
		})
		.then((res) => {
			if (res[0]) {
				return res[0].hash
			} else {
				throw new Error('Error pin data to ipfs')
			}
		})
		.catch(function (err) {
			console.error(err)
			return Promise.reject(new Error(`IPFS Error: ${err}`))
		})
}

module.exports = {
	addFileToIpfs: addFileToIpfs
}
