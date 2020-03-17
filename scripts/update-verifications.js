#!/usr/bin/env node

const { verifyPublisher, isHostnameBlacklisted } = require('../lib/publisherVerification')
const db = require('../db')
const url = require('url')

// import env
require('dotenv').config()

async function run() {
	await db.connect()

	const websitesCol = db.getMongo().collection('websites')
	const allRecords = await websitesCol.find({
		blacklisted: { $ne: true }
	}).toArray()

	for (const website of allRecords) {
		// @TODO we can't re-verify integration cause we don't have the original URL at which it was verified
		const newRecord = await verifyPublisher(website.publisher, 'https://'+website.hostname)
		// only updating specific properties for now
		await websitesCol.updateOne({ _id: website._id }, { $set: {
			updated: newRecord.updated,
			verifiedOwnership: newRecord.verifiedOwnership,
			rank: newRecord.rank,
			reachPerMillion: newRecord.reachPerMillion,
			alexaDataUrl: newRecord.alexaDataUrl,
		} })
		if (newRecord.verifiedOwnership !== website.verifiedOwnership)
			console.log(
				`website ${website.hostname} is now `
				+ (newRecord.verifiedOwnership ? 'verified as owned' : 'un-verified as owned')
			)
		console.log(`refreshed ${website.hostname} (alexa: ${newRecord.rank})`)
	}
	process.exit(0)
}

run().catch(e => {
	console.error(e)
	process.exit(1)
})
