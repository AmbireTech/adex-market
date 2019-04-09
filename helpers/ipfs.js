const ipfsClient = require('ipfs-http-client')
const ipfsHost = process.env.IPFSHOST || 'ipfs.adex.network'
const ipfsPort = process.env.IPFSPORT || '8443'
const ipfsProtocol = process.env.IPFSPROTOCOL || 'https'
const ipfs = ipfsClient(ipfsHost, ipfsPort, { protocol: ipfsProtocol })

async function addDataToIpfs (data) {
	// Buffer is moved to separate routes where it is necessary

	try {
		const res = (await ipfs.add(data))[0]

		if (!res) {
			throw new Error('Error adding data to ipfs')
		}

		const pinned = (await ipfs.pin.add(res.hash))[0]

		if (!pinned) {
			throw new Error('Error pin data to ipfs')
		}

		return pinned.hash
	} catch (err) {
		throw new Error(`IPFS Error: ${err}`)
	}
}

module.exports = addDataToIpfs
