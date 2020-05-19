const url = require('url')
const fetch = require('node-fetch')
const fakeUa = require('fake-useragent')
const xml2js = require('xml2js')
const RELAYER_HOST = process.env.RELAYER_HOST || 'https://relayer.adex.network'
const { AWIS_KEY, WEBSHRINKER_KEY_AND_SECRET } = process.env

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

async function getWebshrinkerCategories(website) {
	if (!WEBSHRINKER_KEY_AND_SECRET) return {}
	const { hostname } = url.parse(website)
	const Authorization =
		'Basic ' + Buffer.from(WEBSHRINKER_KEY_AND_SECRET).toString('base64')
	const rootName = hostname
		.split('.')
		.slice(-2)
		.join('.')
	const resp = await fetch(
		`https://api.webshrinker.com/categories/v3/${Buffer.from(
			'https://' + hostname
		).toString('base64')}`,
		{
			headers: { Authorization },
		}
	)

	const { data, error } = await resp.json()
	if (error) throw new Error(error.message)

	const categories = data[0].categories

	// If the subdomain is uncategorized, try the root domain
	if (
		categories.length === 1 &&
		categories[0].id === 'IAB24' &&
		rootName !== hostname
	)
		return getWebshrinkerCategories(`https://${rootName}`)

	// We remove categories we're not confident abput
	const webshrinkerIABCategories = categories
		.filter(x => x.confident)
		.map(x => {
			if (!x.id.startsWith('IAB'))
				throw new Error(`invalid category ID: ${x.id}`)
			return x.id
		})
	return { webshrinkerIABCategories }
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
	return (
		(await verifyOwnershipDNSForName(publisherAddr, hostname)) ||
		(await verifyOwnershipDNSForName(publisherAddr, rootName))
	)
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
			(record.name === `${name}.` || record.name === name) &&
			(record.data === `"${expectedOwnershipStr}"` ||
				record.data === expectedOwnershipStr ||
				record.data === publisherAddr)
	)
}

async function verifyOwnershipWellKnown(publisherAddr, websiteUrl) {
	const { hostname } = url.parse(websiteUrl)
	try {
		const resp = await fetch(`https://${hostname}/.well-known/adex.txt`, {
			timeout: 3000,
		})
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

async function verifyPublisher(addr, websiteUrl) {
	const { protocol, hostname } = url.parse(websiteUrl)
	if (protocol !== 'https:') throw new Error('only HTTPS websiteUrls allowed')

	// This check here is almost redundant, but we do it to ensure the `publisher` variable is set
	// to whatever is canonical on the relayer (checksummed addr)
	const identityData = await getAccount(addr.toLowerCase())
	if (!identityData) throw new Error('publisher does not exist')
	const publisher = identityData.deployData._id

	const [
		verifiedOwnership,
		alexaStats,
		webshrinkerCategories,
	] = await Promise.all([
		verifyOwnership(publisher, websiteUrl),
		getAlexaStats(websiteUrl),
		getWebshrinkerCategories(websiteUrl),
	])
	const isReputableTld = REPUTABLE_TLDS.includes(hostname.split('.').pop())
	const ifBlacklisted = isHostnameBlacklisted(hostname)
		? { blacklisted: true }
		: {}
	return {
		publisher,
		hostname,
		websiteUrl,
		...alexaStats,
		...webshrinkerCategories,
		...ifBlacklisted,
		verifiedIntegration: false,
		verifiedOwnership,
		isReputableTld,
		updated: new Date(),
	}
}

// Detect whether the site seems like incentivized traffic
// we can only ever set that flag automatically, not unset it
// unsetting has to happen manually
async function detectExtraFlags(publisherAddr, websiteUrl) {
	const { hostname } = url.parse(websiteUrl)
	const isReputableTld = REPUTABLE_TLDS.includes(hostname.split('.').pop())
	if (
		!isReputableTld &&
		(hostname.includes('faucet') ||
			hostname.includes('earnfree') ||
			hostname.includes('bitsfree'))
	)
		return { 'webshrinkerCategoriesOverrides.incentivized': true }
	const INCENTIVIZED_REGEX = /earn (bitcoin|money|free)|paid to click|ptc ads|faucet( )?pay|paid faucet|(bitcoin,dogecoin,litecoin) faucet/gi
	try {
		const resp = await fetch(websiteUrl, {
			timeout: 5000,
			redirect: 'follow',
			headers: { 'user-agent': fakeUa() },
		})
		if (resp.status !== 200) return {}
		const text = await resp.text()
		if (text.match(INCENTIVIZED_REGEX))
			return { 'webshrinkerCategoriesOverrides.incentivized': true }
		else return {}
	} catch (e) {
		return {}
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
	getWebshrinkerCategories,
	verifyPublisher,
	detectExtraFlags,
	validQuery,
	isHostnameBlacklisted,
	BLACKLISTED_HOSTNAMES,
}
