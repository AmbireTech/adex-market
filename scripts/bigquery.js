require('dotenv').config()
const { getDb, connect } = require('../db')
const { BigQuery } = require('@google-cloud/bigquery')
const WEBSITES_TABLE_NAME = 'websites'
const DATASET_NAME = process.env.DATASET_NAME || 'development'
const options = {
	keyFilename: './credentials/adex-bigquery.json',
	projectId: process.env.GOOGLE_CLOUD_PROJECT,
}

let dataset = null

async function createUserTable() {
	// Create the dataset
	await dataset.createTable(WEBSITES_TABLE_NAME, {
		schema: {
			fields: [
				{ name: 'id', type: 'STRING', mode: 'REQUIRED' },
				{ name: 'hostname', type: 'STRING', mode: 'REQUIRED' },
				{ name: 'publisher', type: 'STRING', mode: 'REQUIRED' },
				{ name: 'created', type: 'TIMESTAMP', mode: 'NULLABLE' },
				{ name: 'updated', type: 'TIMESTAMP', mode: 'NULLABLE' },
				{ name: 'verifiedForce', type: 'BOOL', mode: 'NULLABLE' },
				{ name: 'verifiedIntegration', type: 'BOOL', mode: 'NULLABLE' },
				{ name: 'verifiedOwnership', type: 'BOOL', mode: 'NULLABLE' },
				{ name: 'websiteUrl', type: 'STRING', mode: 'NULLABLE' },
				{ name: 'rank', type: 'INT64', mode: 'NULLABLE' },
				{ name: 'reachPerMillion', type: 'FLOAT64', mode: 'NULLABLE' },
				{ name: 'webshrinkerCategories', type: 'ARRAY', mode: 'NULLABLE' },
			],
		},
	})
	startImport(
		WEBSITES_TABLE_NAME,
		getDb()
			.collection('websites')
			.find()
			.sort({ _id: -1 })
			.stream(),
		function(website) {
			if (!website) return
			return {
				id: website._id.toString(),
				hostname: website.hostname.toString(),
				created: website.created
					? parseInt(new Date(website.created).getTime() / 1000)
					: null,
				updated: website.updated
					? parseInt(new Date(website.created).getTime() / 1000)
					: null,
				verifiedForce: website.verifiedForce,
				verifiedIntegration: website.verifiedIntegration,
				websiteUrl: website.websiteUrl,
				rank: website.rank,
				reachPerMillion: parseFloat(website.reachPerMillion),
				webshrinkerCategories: website.webshrinkerCategories,
			}
		}
	)
}

function importTables(cb) {
	// Create BigQuery table - Users
	dataset
		.table(WEBSITES_TABLE_NAME)
		.delete()
		.then(createUserTable, createUserTable)

	cb()
}

async function init() {
	try {
		await connect()
		const bigqueryClient = new BigQuery(options)

		// Make sure there is a dataset with that name otherwise create it
		dataset = bigqueryClient.dataset(DATASET_NAME)
		const [datasetExists] = await dataset.exists()
		if (!datasetExists) dataset = await dataset.create()

		// Create Tables
		importTables()
	} catch (error) {
		console.log(error.message)
	}
}

function startImport(tableName, stream, map) {
	let ready = false
	let found = 0
	let done = 0
	let queue = []

	stream.on('data', processObj)
	stream.on('end', function() {
		ready = true
		checkReady()
	})

	function processObj(data) {
		found++
		const mappedData = map(data)

		if (found - done > 20000) {
			stream.pause()
			flush()
		}

		if (!mappedData) {
			done++
			checkReady()
		}

		if (mappedData) {
			queue.push(mappedData)
		}

		if (queue.length > 150) flush()
	}

	async function flush() {
		const toInsert = [].concat(queue)
		try {
			queue = []
			await dataset.table(tableName).insert(toInsert)
			done += toInsert.length
			checkReady()
		} catch (e) {
			if (e && e.errors) {
				e.errors.forEach(e => {
					console.error('table.insert catch err', e)
				})
			} else {
				console.error('table.insert catch', e)
			}
			process.exit(1)
		}
	}

	function checkReady() {
		console.log('DONE/' + tableName + ': ' + done)
		if (ready && queue.length) flush()
		if (ready && done === found) {
			isReady()
		}
		if (found - done < 100) stream.resume()
	}

	function isReady() {
		console.log(
			'-> READY, IMPORTED ' + done + ' ITEMS INTO BIGQUERY/' + tableName
		)
		process.exit(0)
	}
}

init()
