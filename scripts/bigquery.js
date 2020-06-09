require('dotenv').config()
const { getMongo, connect } = require('../db')
const { BigQuery } = require('@google-cloud/bigquery')
const getRequest = require('../helpers/getRequest')

const ADEX_MARKET_URL = process.env.ADEX_MARKET_URL || 'http://localhost:3012'
const WEBSITES_TABLE_NAME = 'websites' //use the same table name from the db
const ADSLOTS_TABLE_NAME = 'adSlots' //use the same table name from the db
const DATASET_NAME = process.env.DATASET_NAME || 'development'
const options = {
	keyFilename: './credentials/adex-bigquery.json',
	projectId: process.env.GOOGLE_CLOUD_PROJECT,
}

let dataset = null

async function createWebsitesTable() {
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
				{ name: 'webshrinkerCategories', type: 'STRING', mode: 'REPEATED' },
			],
		},
	})
	return startImport(
		WEBSITES_TABLE_NAME,
		getMongo()
			.collection(WEBSITES_TABLE_NAME)
			.find()
			.sort({ _id: -1 })
			.stream(),
		function(website) {
			if (!website) return
			return {
				id: website._id.toString(),
				hostname: website.hostname.toString(),
				publisher: website.publisher.toString(),
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
				webshrinkerCategories: website.webshrinkerCategories || [],
			}
		}
	)
}

async function createAdSlotTable() {
	// Create the dataset
	await dataset.createTable(ADSLOTS_TABLE_NAME, {
		schema: {
			fields: [
				{ name: 'id', type: 'STRING', mode: 'REQUIRED' },
				{ name: 'owner', type: 'STRING', mode: 'REQUIRED' },
				{ name: 'type', type: 'STRING', mode: 'REQUIRED' },
				{ name: 'title', type: 'STRING', mode: 'NULLABLE' },
				{ name: 'description', type: 'STRING', mode: 'NULLABLE' },
				{ name: 'created', type: 'TIMESTAMP', mode: 'NULLABLE' },
				{ name: 'archived', type: 'BOOL', mode: 'NULLABLE' },
				{ name: 'alexaRank', type: 'INT64', mode: 'NULLABLE' },
				{ name: 'categories', type: 'STRING', mode: 'REPEATED' },
				{ name: 'acceptedReferrers', type: 'STRING', mode: 'REPEATED' },
			],
		},
	})
	return startImport(
		ADSLOTS_TABLE_NAME,
		getMongo()
			.collection(ADSLOTS_TABLE_NAME)
			.find()
			.sort({ _id: -1 })
			.stream(),
		async function(adSlot) {
			if (!adSlot) return
			const res = await getRequest(`${ADEX_MARKET_URL}/slots/${adSlot.ipfs}`)
			const { slot, acceptedReferrers, alexaRank, categories } = res
			return {
				id: adSlot.ipfs,
				owner: slot.owner,
				type: slot.type,
				title: slot.title,
				description: slot.description,
				created: slot.created
					? parseInt(new Date(slot.created).getTime() / 1000)
					: null,
				archived: slot.archived,
				alexaRank,
				acceptedReferrers,
				categories,
			}
		}
	)
}

async function deleteTableAndImport(websiteName, createTableFunc) {
	try {
		await dataset.table(websiteName).delete()
		console.log('deleted:', websiteName)
	} catch (error) {
		console.log(error)
	}
	return createTableFunc()
}

function importTables(cb) {
	Promise.all([
		deleteTableAndImport(WEBSITES_TABLE_NAME, createWebsitesTable),
		deleteTableAndImport(ADSLOTS_TABLE_NAME, createAdSlotTable),
	]).then(() => process.exit(0))

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

		// There is a time limit restriction
		// TODO: add when table fill is ran under 2 min
		// Create Tables
		importTables(() => console.log('Init called'))
	} catch (error) {
		console.log(error.message)
		process.exit(1)
	}
}

function startImport(tableName, stream, map) {
	let ready = false
	let found = 0
	let done = 0
	let queue = []

	return new Promise((resolve, reject) => {
		stream.on('data', processObj)
		stream.on('end', async () => {
			ready = true
			const isReady = await checkReady()
			resolve(isReady)
		})
		stream.on('error', err => reject(err))
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
			const resolved = await Promise.all(toInsert)
			await dataset.table(tableName).insert(resolved)
			done += toInsert.length
			return checkReady()
		} catch (e) {
			if (e && e.errors) {
				e.errors.forEach(e => {
					console.error('table.insert catch err', e)
				})
			} else {
				console.error('table.insert catch', e)
			}
		}
	}

	function checkReady() {
		console.log('DONE/' + tableName + ': ' + done)
		if (ready && queue.length) return flush()
		if (ready && done === found) {
			return isReady()
		}
		if (found - done < 100) stream.resume()
	}

	function isReady() {
		console.log(
			'-> READY, IMPORTED ' + done + ' ITEMS INTO BIGQUERY/' + tableName
		)
		return true
	}
}

init()
