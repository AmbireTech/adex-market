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

async function verifyIntegration(publisherAddr, websiteUrl) {
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
	const contentType = response.headers.get('content-type')
	if (contentType.split(';')[0] !== 'text/html')
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

async function verifyOwnership(publisherAddr, websiteUrl) {
	const { hostname } = url.parse(websiteUrl)
	const resp = await fetch(`https://cloudflare-dns.com/dns-query?name=${hostname}&type=TXT`, {
		headers: { accept: 'application/dns-json' }
	})
	const dnsResp = await resp.json()
	if (!dnsResp.Answer) return false
	return dnsResp.Answer.some(record =>
		record.name === `${hostname}.`
			&& record.data === `"adex-publisher=${publisherAddr}"`
	)
}

module.exports = async function verifyPublisher(addr, websiteUrl, opts = {}) {
	const { protocol, hostname } = url.parse(websiteUrl)
	if (protocol !== 'https:') throw new Error('only HTTPS websiteUrls allowed')

	// This check here is almost redundant, but we do it to ensure the `publisher` variable is set
	// to whatever is canonical on the relayer (checksummed addr)
	const identityData = await getAccount(addr)
	if (!identityData) throw new Error('publisher does not exist')
	const publisher = identityData.deployData._id

	// For now, we just log errors on the integration check and count it as failed check
	const onFailedIntegrationCheck = e => {
		console.error(`verifying integration for ${websiteUrl} failed: ${e.message}`)
		return false
	}
	const [verifiedIntegration, verifiedOwnership] = await Promise.all([
		verifyIntegration(publisher, websiteUrl).catch(onFailedIntegrationCheck),
		verifyOwnership(publisher, websiteUrl)
	])
	const verifiedForce = opts.force
	const created = new Date()
	return { publisher, hostname, verifiedIntegration, verifiedOwnership, verifiedForce, created }
}
