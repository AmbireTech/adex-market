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
// @TODO: add expensive country-specific ones
const REPUTABLE_TLDS = [
	'com',
	'net',
	'org',
	'int',
	'gov',
	'io',
	'me',
	'tv',
	'uk',
	'edu',
]

async function getAccount(addr) {
	const r = await fetch(`${RELAYER_HOST}/identity/${addr}`)
	const response = await r.json()
	if (r.status !== 200 && r.status !== 404) {
		const err = new Error(`unexpected response: ${r.status}`)
		err.response = response
		throw err
	} else return response
}


async function getAlexaCategories(website) {
	if (!AWIS_KEY) return {} 
	const { hostname } = url.parse(website)
	const resp = await fetch(
		`https://awis.api.alexa.com/api?Action=UrlInfo&Output=json&ResponseGroup=Categories&Url=${hostname}`,
		{
			headers: { 'x-api-key': AWIS_KEY },
		}
	)
	const { Awis } = await resp.json()
	const categoriesRaw = Awis.Results.Result.Alexa.Related.Categories
	const categories = (categoriesRaw && categoriesRaw.CategoryData) ? categoriesRaw.CategoryData.map(x => x.AbsolutePath) : []
	return { categories }
}

function ownershipStr(publisherAddr) {
	return `adex-publisher=${publisherAddr}`
}

async function verifyOwnershipDNS(publisherAddr, websiteUrl) {
	const { hostname } = url.parse(websiteUrl)
	const rootName = hostname
		.split('.')
		.slice(-2)
		.join('.')
	return await verifyOwnershipDNSForName(publisherAddr, hostname)
		|| await verifyOwnershipDNSForName(publisherAddr, rootName)
}

async function verifyOwnershipDNSForName(publisherAddr, name) {
	const resp = await fetch(
		`https://cloudflare-dns.com/dns-query?name=${name}&type=TXT`,
		{
			headers: { accept: 'application/dns-json' },
		}
	)
	const dnsResp = await resp.json()
	if (!dnsResp.Answer) return false
	const expectedOwnershipStr = ownershipStr(publisherAddr)
	return dnsResp.Answer.some(
		record =>
			(record.name === `${name}.` ||
				record.name === name) &&
			(record.data === `"${expectedOwnershipStr}"` ||
				record.data === expectedOwnershipStr ||
				record.data === publisherAddr)
	)
}

async function verifyOwnershipWellKnown(publisherAddr, websiteUrl) {
	const { hostname } = url.parse(websiteUrl)
	try {
		const resp = await fetch(`https://${hostname}/.well-known/adex.txt`, { timeout: 4000 })
		if (resp.status !== 200) return false
		const text = await resp.text()
		return text.trim() === ownershipStr(publisherAddr)
	} catch (e) {
		console.error(
			`verifying .well-known for ${websiteUrl} failed: ${e.message}`
		)
		return false
	}
}

async function verifyOwnership(publisherAddr, websiteUrl) {
	const [dns, wellKnown] = await Promise.all([
		verifyOwnershipDNS(publisherAddr, websiteUrl),
		verifyOwnershipWellKnown(publisherAddr, websiteUrl),
	])
	return dns || wellKnown
}

async function getAlexaStats(websiteUrl) {
	if (!AWIS_KEY) return {}
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
		verifiedOwnership,
		alexaStats,
		alexaCategories,
	] = await Promise.all([
		verifyOwnership(publisher, websiteUrl),
		getAlexaStats(websiteUrl),
		getAlexaCategories(websiteUrl),
	])
	const isReputableTld = REPUTABLE_TLDS.includes(hostname.split('.').pop())
	const ifBlacklisted = isHostnameBlacklisted(hostname)
		? { blacklisted: true }
		: {}
	const verifiedForce = opts.force
	return {
		publisher,
		hostname,
		websiteUrl,
		...alexaStats,
		...alexaCategories,
		...ifBlacklisted,
		verifiedIntegration: false,
		verifiedOwnership,
		verifiedForce,
		isReputableTld,
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
	BLACKLISTED_HOSTNAMES,
}
