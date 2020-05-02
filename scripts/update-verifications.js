#!/usr/bin/env node

const pLimit = require('p-limit')

const {
	verifyPublisher,
	BLACKLISTED_HOSTNAMES,
} = require('../lib/publisherVerification')
const db = require('../db')
// import env
require('dotenv').config()

async function run() {
	await db.connect()

	// @TODO: handle DB reading and updating in portions when those records become a lot
	const websitesCol = db.getMongo().collection('websites')
	const allRecords = await websitesCol
		.find({
			blacklisted: { $ne: true },
		})
		.toArray()

	if (allRecords.length > 2000) {
		console.log('WARNING: records over 2000, script needs rewrite!')
	}

	const limit = pLimit(10)
	const verifyAndUpdate = async website => {
		// @TODO we can't re-verify integration cause we don't have the original URL at which it was verified
		const newRecord = await verifyPublisher(
			website.publisher,
			'https://' + website.hostname
		)
		// only updating specific properties for now
		await websitesCol.updateOne(
			{ _id: website._id },
			{
				$set: {
					updated: newRecord.updated,
					verifiedOwnership: newRecord.verifiedOwnership,
					rank: newRecord.rank,
					reachPerMillion: newRecord.reachPerMillion,
					alexaDataUrl: newRecord.alexaDataUrl,
				},
			}
		)
		if (newRecord.verifiedOwnership !== website.verifiedOwnership)
			console.log(
				`website ${website.hostname} is now ` +
					(newRecord.verifiedOwnership
						? 'verified as owned'
						: 'un-verified as owned')
			)
		console.log(`refreshed ${website.hostname} (alexa: ${newRecord.rank})`)
	}

	// Part 1: refresh ownership integrations
	const allUpdates = allRecords.map(website => limit(() =>
		verifyAndUpdate(website))
			.catch(e => console.error(`error verifying ${website.hostname}`, e)
	))
	await Promise.all(allUpdates)

	// Part 2: set blacklist flags
	await websitesCol.updateMany(
		{
			$or: [
				{ hostname: { $in: BLACKLISTED_HOSTNAMES } },
				{ alexaDataUrl: { $in: BLACKLISTED_HOSTNAMES } },
			],
		},
		{ $set: { blacklisted: true } }
	)

	// contagious blacklisting: if there are any other records that match on `hostname`, blacklist them too
	const allHostnameRecords = await websitesCol
		.find({ blacklisted: true }, { projection: { hostname: 1 } })
		.toArray()
	const allHostnames = allHostnameRecords.map(x => x.hostname)
	await websitesCol.updateMany(
		{
			hostname: { $in: allHostnames },
			blacklisted: { $ne: true },
		},
		{ $set: { blacklisted: true } }
	)

	process.exit(0)
}

run().catch(e => {
	console.error(e)
	process.exit(1)
})
