#!/usr/bin/env node

const { verifyPublisher, isHostnameBlacklisted } = require('../lib/publisherVerification')
const db = require('../db')
const url = require('url')

// import env
require('dotenv').config()

async function run() {
	await db.connect()

	const websitesCol = db.getMongo().collection('websites')

	// @TODO
	process.exit(0)
}

run().catch(e => {
	console.error(e)
	process.exit(1)
})
