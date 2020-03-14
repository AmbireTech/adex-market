#!/usr/bin/env node

const { verifyPublisher, getAlexaStats } = require('../lib/publisherVerification')
const db = require('../db')
const url = require('url')

// import env
require('dotenv').config()

// from previous fraud attempts
// for now, only blacklisting hostnames since otherwise we risk exploitation (publishers getting legit domains blacklisted)
const blacklisted = [
	'cryptofans.ru', 'cryptofans.news', 'sciencedaily.news', 'icrypto.media',
	'downloadlagu-mp3.pro', 'enermags.com', 'https://4kmovies.me',
	'www.elsimultimedia.com', '10dollarbigtits.com', 'laguaz.pro', 'coinrevolution.com',
	'aisrafa.com', 'aisrafa.com.au', 'vespabiru.com', 'nuyul.online',
	'www.jfknewsonline.com',
]
const isBlacklisted = hostname => blacklisted.some(b => hostname === b || hostname.endsWith('.'+b))

async function run() {
	await db.connect()

	const adslotsCol = db.getMongo().collection('adSlots')
	const websitesCol = db.getMongo().collection('websites')

	// @TODO dedup by hostname, take first for publisher
	const allVerifiedSites = await websitesCol
		.find(
			{
				$or: [
					{ verifiedOwnership: true },
					{ verifiedIntegration: true },
					{ verifiedForce: true },
				],
			},
			{ projection: { hostname: 1, publisher: 1 } }
		)
		.toArray()

	const allAdSlots = await adslotsCol
		.find(
			{ website: { $exists: true, $nin: ['', null] } },
			{ project: { owner: 1, website: 1 } }
		)
		.toArray()

	const unverified = allAdSlots.filter(slot => {
		const { hostname } = url.parse(slot.website)
		const firstHostname = allVerifiedSites.find(x => x.hostname === hostname)
		return !firstHostname || firstHostname.publisher !== slot.owner
	})

	for (const slot of unverified) {
		const { hostname } = url.parse(slot.website)
		// be careful as the blacklisted flag is not respected in prod yet
		if (isBlacklisted(hostname)) continue
		const stats = await getAlexaStats(slot.website)
		if (!stats.rank) continue
		console.log(stats.rank, slot.website)
	}

	process.exit(0)
}

run().catch(e => {
	console.error(e)
	process.exit(1)
})
