#!/usr/bin/env node
const verifyPublisher = require('../lib/publisherVerification')
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
			{ website: { $exists: true, $ne: null } },
			{ project: { owner: 1, website: 1 } }
		)
		.toArray()

	const unverified = allAdSlots.filter(slot => {
		const { hostname } = url.parse(slot.website)
		const firstHostname = allVerifiedSites.find(x => x.hostname === hostname)
		return !firstHostname || firstHostname.publisher !== slot.owner
	})
	console.log(unverified)

	process.exit(0)
}

run().catch(e => {
	console.error(e)
	process.exit(1)
})
