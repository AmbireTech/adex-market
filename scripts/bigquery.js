#!/usr/bin/env node
require('dotenv').config()
const { getMongo, connect } = require('../db')
const { BigQuery } = require('@google-cloud/bigquery')
const getRequest = require('../helpers/getRequest')
const { formatUnits } = require('ethers/utils')

// make sure you use the corresponding market to the db you use
const MISSING_DATA_FILLER = 'N/A'
const ADEX_MARKET_URL = process.env.ADEX_MARKET_URL || 'http://localhost:3012'
const WEBSITES_TABLE_NAME = 'websites'
const ADSLOTS_TABLE_NAME = 'adSlots'
const CAMPAIGNS_TABLE_NAME = 'campaigns'
const BIGQUERY_RATE_LIMIT = 10 // There is a limit of ~ 2-10 min between delete and insert
const DATASET_NAME = process.env.DATASET_NAME || 'development'
const TOKEN_DECIMALS = process.env.TOKEN_DECIMALS || 18
const options = {
	keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
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
				{ name: 'reachPerMillion', type: 'NUMERIC', mode: 'NULLABLE' },
				{ name: 'webshrinkerCategories', type: 'STRING', mode: 'REPEATED' },
			],
		},
	})
	return startImport(
		WEBSITES_TABLE_NAME,
		getMongo()
			.collection('websites')
			.find()
			.sort({ _id: -1 })
			.stream(),
		function(website) {
			if (!website) return
			return {
				id: website._id.toString(),
				hostname: website.hostname.toString().replace('www.', ''),
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
				webshrinkerCategories:
					website.webshrinkerCategories &&
					website.webshrinkerCategories.length > 0
						? website.webshrinkerCategories
						: [MISSING_DATA_FILLER],
			}
		}
	)
}

async function createCampaignsTable() {
	// Create the dataset
	await dataset.createTable(CAMPAIGNS_TABLE_NAME, {
		schema: {
			fields: [
				{ name: 'campaignId', type: 'STRING', mode: 'REQUIRED' },
				{ name: 'creator', type: 'STRING', mode: 'REQUIRED' },
				{ name: 'depositAmount', type: 'NUMERIC', mode: 'NULLABLE' },
				{ name: 'createdDate', type: 'TIMESTAMP', mode: 'NULLABLE' },
				{ name: 'adUnits', type: 'STRING', mode: 'REPEATED' },
				{ name: 'validUntil', type: 'TIMESTAMP', mode: 'NULLABLE' },
				{ name: 'status', type: 'STRING', mode: 'NULLABLE' },
			],
		},
	})
	return startImport(
		CAMPAIGNS_TABLE_NAME,
		getMongo()
			.collection('campaigns')
			.find()
			.sort({ _id: -1 })
			.stream(),
		function(campaign) {
			if (!campaign) return
			return {
				campaignId: campaign._id.toString(),
				creator: campaign.creator.toString(),
				depositAmount: Number(
					formatUnits(campaign.depositAmount, TOKEN_DECIMALS)
				),
				createdDate: campaign.spec.created
					? parseInt(new Date(campaign.spec.created).getTime() / 1000)
					: null,
				adUnits: campaign.spec.adUnits.map(i => i.ipfs),
				validUntil: campaign.validUntil || null,
				status: campaign.status.name,
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
				{ name: 'hostname', type: 'STRING', mode: 'NULLABLE' },
			],
		},
	})
	return startImport(
		ADSLOTS_TABLE_NAME,
		getMongo()
			.collection('adSlots')
			.find()
			.sort({ _id: -1 })
			.stream(),
		async function(adSlot) {
			if (!adSlot) return
			const res = await getRequest(`${ADEX_MARKET_URL}/slots/${adSlot.ipfs}`)
			const { slot, acceptedReferrers, alexaRank, categories } = res
			const hostname =
				acceptedReferrers && acceptedReferrers.length > 0
					? new URL(acceptedReferrers[0]).hostname.replace('www.', '')
					: MISSING_DATA_FILLER
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
				hostname: hostname,
				categories:
					categories && categories.length > 0
						? categories
						: [MISSING_DATA_FILLER],
			}
		}
	)
}

async function deleteTableAndImport(websiteName, createTableFunc) {
	try {
		const [metaResponse] = await dataset.table(websiteName).getMetadata()
		const timeFromLastModifiedMs = +Date.now() - metaResponse.lastModifiedTime
		const timeLimitMs = 60 * BIGQUERY_RATE_LIMIT * 1000
		const timeToWaitMs = (timeLimitMs - timeFromLastModifiedMs) / 1000
		if (timeFromLastModifiedMs > timeLimitMs) {
			await dataset.table(websiteName).delete()
			console.log('deleted:', websiteName)
		} else {
			console.log(
				`You need to wait at least ${BIGQUERY_RATE_LIMIT} min to reinsert table => ${websiteName} | wait ${timeToWaitMs} seconds`
			)
			return false
		}
	} catch (error) {
		console.log(error.message)
	}
	return createTableFunc()
}

function importTables(cb) {
	Promise.all([
		deleteTableAndImport(WEBSITES_TABLE_NAME, createWebsitesTable),
		deleteTableAndImport(ADSLOTS_TABLE_NAME, createAdSlotTable),
		deleteTableAndImport(CAMPAIGNS_TABLE_NAME, createCampaignsTable),
	])
		.then(() => process.exit(0))
		.catch(e => {
			console.log(e)
			process.exit(1)
		})
	cb()
}

async function init() {
	try {
		await connect()
		const bigqueryClient = new BigQuery(options)
		const testAdSlot = await getMongo()
			.collection('adSlots')
			.findOne()
		await getRequest(`${ADEX_MARKET_URL}/slots/${testAdSlot.ipfs}`) // Tests if market is running
		// Make sure there is a dataset with that name otherwise create it
		dataset = bigqueryClient.dataset(DATASET_NAME)
		const [datasetExists] = await dataset.exists()
		if (!datasetExists) {
			await dataset.create()
			dataset = bigqueryClient.dataset(DATASET_NAME)
		}

		// Create Tables
		await importTables(() => console.log('> initiated importTables'))
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
			const resolved = await checkReady()
			resolve(resolved)
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
				e.errors.slice(0, 4).forEach(e => {
					console.error('table.insert catch err', e)
				})
				if (e.errors.length > 6)
					console.log(`There are ${e.errors.length - 5} more errors...`)
			} else {
				console.error('table.insert catch', e)
			}
			process.exit(1)
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
