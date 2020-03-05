const url = require('url')
const fetch = require('node-fetch')
const RELAYER_HOST = process.env.RELAYER_HOST || 'https://relayer.adex.network'

async function getAccount(addr) {
	const r = await fetch(`${RELAYER_HOST}/identity/${addr}`)
	const response = await r.json()
	if (r.status !== 200 && r.status !== 404) throw response
	else return response
}

module.exports = async function verifyPublisher(addr, website, opts = {}) {
	const { protocol, hostname } = url.parse(website)
	if (protocol !== 'https:') throw new Error('only HTTPS websites allowed')

	// This check here is almost redundant, but we do it to ensure the `publisher` variable is set
	// to whatever is canonical on the relayer (checksummed addr)
	const identityData = await getAccount(addr)
	if (!identityData) throw new Error('publisher does not exist')
	const publisher = identityData._id

	
}
