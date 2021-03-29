#!/usr/bin/env node

const pLimit = require('p-limit')

const {
	verifyPublisher,
	detectExtraFlags,
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
			// Update records only if they haven't been updated in a while, or they're new
			$or: [
				{ created: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
				{ updated: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
			],
		})
		.toArray()

	if (allRecords.length > 2000) {
		console.log('WARNING: records over 2000, script needs rewrite!')
	}

	const limit = pLimit(8)
	const verifyAndUpdate = async website => {
		// @TODO we can't re-verify integration cause we don't have the original URL at which it was verified
		const publisher = website.publisher
		const websiteUrl = 'https://' + website.hostname
		const [newRecord, extra] = await Promise.all([
			verifyPublisher(publisher, websiteUrl),
			detectExtraFlags(publisher, websiteUrl),
		])
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
					webshrinkerCategories: newRecord.webshrinkerCategories,
					...extra,
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
	const allUpdates = allRecords.map(website =>
		limit(() => verifyAndUpdate(website)).catch(e =>
			console.error(`error verifying ${website.hostname}`, e)
		)
	)
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
		{ $set: { blacklisted: true, blacklistReason: 'contagious' } }
	)

	process.exit(0)
}

run().catch(e => {
	console.error(e)
	process.exit(1)
})
