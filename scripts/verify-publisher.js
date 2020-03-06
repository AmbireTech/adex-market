#!/usr/bin/env node
const verifyPublisher = require('../lib/publisherVerification')
const db = require('../db')

async function run() {
	await db.connect()
	const argv = process.argv.slice(2)
	if (argv.length < 2 || argv[0].length !== 42) {
		console.error(
			`Usage: ${process.argv[1]} publisherAddr websiteUrl [--force]`
		)
		process.exit(1)
	}
	const result = await verifyPublisher(argv[0], argv[1], {
		force: argv[2] === '--force',
	})

	console.log('Verification results:', result)

	const websitesCol = db.getMongo().collection('websites')
	await websitesCol.updateOne(
		{ publisher: result.publisher, hostname: result.hostname },
		{ $set: result },
		{ upsert: true }
	)

	process.exit(0)
}

run()