#!/usr/bin/env node

/**
 * Export ADX data to Biquery
 */
const fetch = require('node-fetch')
const {
	bigQueryTables,
	createDatasetIfNotExists,
	createTableIfNotExists,
	getTableClient,
	DATASET_NAME,
	GOOGLE_CLOUD_PROJECT,
} = require('../lib/bigquery')

const ADEX_COIN_ID = 'adex'

const volumeSchema = [
	{ name: 'id', type: 'STRING', mode: 'REQUIRED' },
	{ name: 'volume', type: 'NUMERIC', mode: 'REQUIRED' },
	{ name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
]

const priceSchema = [
	{ name: 'id', type: 'STRING', mode: 'REQUIRED' },
	{ name: 'price', type: 'NUMERIC', mode: 'REQUIRED' },
	{ name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
]

// @TODO With an API that gives access to historical exchange ADX volume
//
// const exchanges = ['binance', 'bittrex', 'upbit']

const BASE_URL = 'https://api.coingecko.com/api/v3/'

function normalizedDate() {
	return Math.floor(
		new Date(
			`${new Date().toISOString().slice(0, 10)}T23:59:59.000Z`
		).getTime() / 1000
	)
}

function toRequestFormat(d) {
	const day = d.getDay()
	const month = d.getMonth()
	const year = d.getYear()

	return `${day}-${month}-${year}`
}

async function exportADXPriceAndVolume() {
	await createDatasetIfNotExists()
	await createTableIfNotExists(bigQueryTables.volume, volumeSchema)
	await createTableIfNotExists(bigQueryTables.price, priceSchema)

	const priceTable = getTableClient(bigQueryTables.price)
	const volumeTable = getTableClient(bigQueryTables.volume)

	const query = `SELECT timestamp FROM ${GOOGLE_CLOUD_PROJECT}.${DATASET_NAME}.${bigQueryTables.price} ORDER BY timestamp DESC LIMIT 1`

	const [row] = await priceTable.query({ query })

	// Default is date for 10-01-2017, 1st of october 2017
	let from =
		(row.length &&
			Math.floor(new Date(row[0].timestamp.value).getTime() / 1000)) ||
		1506812400
	const to = normalizedDate()

	const DAY = 24 * 60 * 60

	let dailyPrices = []
	let dailyVolumes = []

	// greater than 90 days
	if (to - from > DAY * 90) {
		const PRICE_HISTORY_URL = `${BASE_URL}/coins/${ADEX_COIN_ID}/market_chart/range?vs_currency=usd&from=${from}&to=${to}`
		// eslint-disable-next-line camelcase
		const { prices, total_volumes } = await fetch(PRICE_HISTORY_URL).then(r =>
			r.json()
		)
		dailyPrices = prices.map(([timestamp, price]) => ({
			id: `${price}:${timestamp}`,
			price: parseFloat(price.toFixed(8)),
			timestamp: new Date(timestamp).toJSON(),
		}))

		dailyVolumes = total_volumes.map(([timestamp, volume]) => ({
			id: `${volume}:${timestamp}`,
			volume: parseFloat(volume.toFixed(8)),
			timestamp: new Date(timestamp).toJSON(),
		}))
	} else {
		const days = []

		while (from > to) {
			from += DAY
			days.push(toRequestFormat(new Date(from * 1000)))
		}

		const responses = await Promise.all(
			days.map(dateParam =>
				fetch(
					`${BASE_URL}/coins/${ADEX_COIN_ID}/history?date=${dateParam}&localization=false`
				).then(r => r.json())
			)
		)
		// eslint-disable-next-line camelcase
		responses.forEach(
			({
				market_data: {
					current_price: { usd },
					total_volume,
				},
			}) => {
				dailyVolumes.push({
					// eslint-disable-next-line camelcase
					id: `${total_volume}:${from}`,
					volume: parseFloat(total_volume.toFixed(8)),
					timestamp: new Date(from).toJSON(),
				})
				dailyPrices.push({
					id: `${usd}:${from}`,
					price: parseFloat(usd.toFixed(8)),
					timestamp: new Date(from).toJSON(),
				})
			}
		)
	}

	await Promise.all([
		(dailyPrices.length && priceTable.insert(dailyPrices)) || true,
		(dailyVolumes.length && volumeTable.insert(dailyVolumes)) || true,
	]).catch(e => console.error(e))

	console.log(`Inserted ${dailyPrices.length} price rows`)
	console.log(`Inserted ${dailyVolumes.length} volume rows`)
}

exportADXPriceAndVolume().then(() =>
	console.log(`Finished export - ${new Date()}`)
)
