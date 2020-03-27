#!/usr/bin/env node

const {
	verifyPublisher,
	validQuery,
	isHostnameBlacklisted,
} = require('../lib/publisherVerification')
const db = require('../db')
const url = require('url')

// import env
require('dotenv').config()

async function run() {
	await db.connect()

	const adslotsCol = db.getMongo().collection('adSlots')
	const websitesCol = db.getMongo().collection('websites')

	// @TODO dedup by hostname, take first for publisher
	const allVerifiedSites = await websitesCol
		.find(validQuery, { projection: { hostname: 1, publisher: 1 } })
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
		const { hostname, protocol } = url.parse(slot.website)

		if (protocol !== 'https:') {
			console.log(`skip ${slot.owner} ${slot.website} cause of protocol`)
			continue
		}

		// be careful as the blacklisted flag is not respected in prod yet
		if (isHostnameBlacklisted(hostname)) {
			console.log(`skip ${slot.owner} ${hostname} because it is blacklisted`)
			continue
		}

		// skip non-www subdomains
		const hostnameParts = hostname.split('.')
		if (
			!(
				hostnameParts.length === 2 ||
				(hostnameParts.length === 3 && hostnameParts[0] === 'www')
			)
		) {
			console.log(`skip ${slot.owner} ${hostname} because of the hostname`)
			continue
		}

		// For now, skip the ones that don't have a rank or it's too low
		const result = await verifyPublisher(slot.owner, slot.website)
		const rankOk = result.rank && result.rank < 200000
		const passes = result.verifiedIntegration || result.verifiedOwnership
		if (!rankOk) {
			console.log(`skip ${slot.owner} ${hostname} because rank is too low`)
			continue
		}
		if (passes) {
			console.log(`successful verification for ${slot.owner} ${hostname}`)
		}
		if (rankOk && !passes) {
			console.log(
				`skip ${slot.owner} ${hostname} cause it did not pass verification but rank is ${result.rank}`
			)
		}
		await websitesCol.updateOne(
			{ publisher: result.publisher, hostname: result.hostname },
			{ $set: result, $setOnInsert: { created: new Date() } },
			{ upsert: true }
		)
	}

	process.exit(0)
}

run().catch(e => {
	console.error(e)
	process.exit(1)
})
