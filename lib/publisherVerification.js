const url = require('url')
const fetch = require('node-fetch')
const fakeUa = require('fake-useragent')
const RELAYER_HOST = process.env.RELAYER_HOST || 'https://relayer.adex.network'

async function getAccount(addr) {
	const r = await fetch(`${RELAYER_HOST}/identity/${addr}`)
	const response = await r.json()
	if (r.status !== 200 && r.status !== 404) {
		const err = new Error(`unexpected response: ${r.status}`)
		err.response = response
		throw err
	}
	else return response
}

module.exports = async function verifyPublisher(addr, websiteUrl, opts = {}) {
	const { protocol, hostname } = url.parse(websiteUrl)
	if (protocol !== 'https:') throw new Error('only HTTPS websiteUrls allowed')

	// This check here is almost redundant, but we do it to ensure the `publisher` variable is set
	// to whatever is canonical on the relayer (checksummed addr)
	const identityData = await getAccount(addr)
	if (!identityData) throw new Error('publisher does not exist')
	const publisher = identityData._id

	// @TODO opts.force or code included (try a few times) or DNS record
	// @TODO decide if this will be a pure fn
	const r = await fetch(websiteUrl, {
		headers: {
			'user-agent': fakeUa()
		}
	})
	if (r.status !== 200) throw new Error('website does not return HTTP 200')

}
