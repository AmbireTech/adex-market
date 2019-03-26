const ipfsClient = require('ipfs-http-client')
const ipfsHost = process.env.IPFSHOST || 'ipfs.adex.network'
const ipfsPort = process.env.IPFSPORT || '8443'
const ipfsProtocol = process.env.IPFSPROTOCOL || 'https'
const ipfs = ipfsClient(ipfsHost, ipfsPort, { protocol: ipfsProtocol })

function addFileToIpfs (file) {
	return ipfs.add(file)
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
			console.error('fail', err)
			return Promise.reject(new Error(`IPFS Error: ${err}`))
		})
}

module.exports = {
	addFileToIpfs: addFileToIpfs
}
