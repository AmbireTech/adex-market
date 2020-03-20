const url = require('url')
const fetch = require('node-fetch')
const fakeUa = require('fake-useragent')
const xml2js = require('xml2js')
const RELAYER_HOST = process.env.RELAYER_HOST || 'https://relayer.adex.network'
const AWIS_KEY = process.env.AWIS_KEY

// from previous fraud attempts
// for now, only blacklisting hostnames since otherwise we risk exploitation (publishers getting legit domains blacklisted)
const BLACKLISTED_HOSTNAMES = require('./publisherBlacklistedHostnames')
const isHostnameBlacklisted = hostname =>
	BLACKLISTED_HOSTNAMES.some(b => hostname === b || hostname.endsWith('.' + b))

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
	// @TODO more sophisticated check here - but no regex
	return (
		html.includes(`publisherAddr%22%3A%22${publisherAddr}`) &&
		html.includes(`src="https://viewm.moonicorn.network`)
	)
}

async function verifyOwnership(publisherAddr, websiteUrl) {
	const { hostname } = url.parse(websiteUrl)
	const rootName = hostname
		.split('.')
		.slice(-2)
		.join('.')
	const resp = await fetch(
		`https://cloudflare-dns.com/dns-query?name=${rootName}&type=TXT`,
		{
			headers: { accept: 'application/dns-json' },
		}
	)
	const dnsResp = await resp.json()
	if (!dnsResp.Answer) return false
	return dnsResp.Answer.some(
		record =>
			(record.name === `${hostname}.` ||
				record.name === hostname ||
				record.name === rootName) &&
			(record.data === `"adex-publisher=${publisherAddr}"` ||
				record.data === `adex-publisher=${publisherAddr}` ||
				record.data === publisherAddr)
	)
}

async function getAlexaStats(websiteUrl) {
	if (!AWIS_KEY) return null
	const { hostname } = url.parse(websiteUrl)
	const resp = await fetch(
		`https://awis.api.alexa.com/api?Action=UrlInfo&ResponseGroup=Rank,UsageStats&Url=${hostname}`,
		{
			headers: { 'x-api-key': AWIS_KEY },
		}
	)
	const parser = new xml2js.Parser()
	const { Awis } = await parser.parseStringPromise(await resp.text())
	//if (!Awis.Results[0]) return { }
	const trafficData = Awis.Results[0].Result[0].Alexa[0].TrafficData[0]
	const alexaDataUrl = trafficData.DataUrl ? trafficData.DataUrl[0] : null
	const usageStats = trafficData.UsageStatistics
		? trafficData.UsageStatistics[0].UsageStatistic
		: null
	// First one in usageStats is for the last 3 months
	const reachPerMillion = usageStats
		? usageStats[0].Reach[0].PerMillion[0].Value[0]
		: null
	const rankStr = Awis.Results[0].Result[0].Alexa[0].TrafficData[0].Rank[0]
	const rank = rankStr ? parseInt(rankStr, 10) : 0
	// Reset if it's a random subdomain: e.g. `random.blogpost.com`
	if (
		!(
			alexaDataUrl === hostname ||
			'www.' + alexaDataUrl === hostname ||
			'app.' + alexaDataUrl === hostname ||
			'm.' + alexaDataUrl === hostname
		)
	) {
		return { alexaDataUrl, rank: null, reachPerMillion: null }
	}
	return { rank, reachPerMillion, alexaDataUrl }
}

async function verifyPublisher(addr, websiteUrl, opts = {}) {
	const { protocol, hostname } = url.parse(websiteUrl)
	if (protocol !== 'https:') throw new Error('only HTTPS websiteUrls allowed')

	// This check here is almost redundant, but we do it to ensure the `publisher` variable is set
	// to whatever is canonical on the relayer (checksummed addr)
	const identityData = await getAccount(addr.toLowerCase())
	if (!identityData) throw new Error('publisher does not exist')
	const publisher = identityData.deployData._id

	// For now, we just log errors on the integration check and count it as failed check
	const onFailedIntegrationCheck = e => {
		console.error(
			`verifying integration for ${websiteUrl} failed: ${e.message}`
		)
		return false
	}
	const [
		verifiedIntegration,
		verifiedOwnership,
		alexaStats,
	] = await Promise.all([
		verifyIntegration(publisher, websiteUrl).catch(onFailedIntegrationCheck),
		verifyOwnership(publisher, websiteUrl),
		getAlexaStats(websiteUrl),
	])
	const ifBlacklisted = isHostnameBlacklisted(hostname) ? { blacklisted: true } : {}
	const verifiedForce = opts.force
	return {
		publisher,
		hostname,
		websiteUrl,
		...alexaStats,
		...ifBlacklisted,
		verifiedIntegration,
		verifiedOwnership,
		verifiedForce,
		updated: new Date(),
	}
}

const validQuery = {
	$or: [
		{ verifiedIntegration: true },
		{ verifiedOwnership: true },
		{ verifiedForce: true },
	],
	blacklisted: { $ne: true },
}

module.exports = {
	getAlexaStats,
	verifyPublisher,
	validQuery,
	isHostnameBlacklisted,
	BLACKLISTED_HOSTNAMES
}
