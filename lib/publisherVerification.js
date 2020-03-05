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
	} else return response
}

module.exports = async function verifyPublisher(addr, websiteUrl, opts = {}) {
	const { protocol, hostname } = url.parse(websiteUrl)
	if (protocol !== 'https:') throw new Error('only HTTPS websiteUrls allowed')

	// This check here is almost redundant, but we do it to ensure the `publisher` variable is set
	// to whatever is canonical on the relayer (checksummed addr)
	const identityData = await getAccount(addr)
	if (!identityData) throw new Error('publisher does not exist')
	const publisher = identityData.deployData._id

	const verifiedIntegration =
		opts.force || (await verifyIntegration(publisher, websiteUrl))
	const created = new Date()
	return { publisher, hostname, verifiedIntegration, created }
}

async function verifyIntegration(publisherAddr, websiteUrl) {
	// @TODO opts.force or code included (try a few times) or DNS record
	// @TODO follow redirects as long as they point to the same hostname
	const response = await fetch(websiteUrl, {
		redirect: 'follow',
		follow: 1,
		headers: {
			'user-agent': fakeUa(),
		},
	})
	if (response.status !== 200)
		throw new Error('website does not return HTTP 200')
	if (url.parse(response.url).hostname !== url.parse(websiteUrl).hostname)
		throw new Error('website redirected to a different hostname')
	if (!response.headers.get('content-type').startsWith('text/html;'))
		throw new Error('unexpected content type')
	const disposition = response.headers.get('content-disposition')
	if (!(disposition === null || disposition === 'inline'))
		throw new Error('content disposition is not inline')

	const html = await response.text()
	return (
		html.includes(`publisherAddr%22%3A%22${publisherAddr}`) &&
		html.includes(`src="https://viewm.moonicorn.network`)
	)
}
