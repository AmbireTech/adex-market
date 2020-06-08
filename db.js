const fs = require('fs')
const { MongoClient } = require('mongodb')

const url = process.env.DB_MONGO_URL || 'mongodb://localhost:27017'
const dbName = process.env.DB_MONGO_NAME || 'adexMarket'

let db = null

function getMongoOptions(options) {
	const mongoUseTls = process.env['DB_MONGO_USE_TLS'] || false

	if (mongoUseTls) {
		// Read the certificates
		const mongoCa = [
			fs.readFileSync(process.env['DB_MONGO_CA'] || 'rootCA.crt'),
		]
		const mongoCert = fs.readFileSync(
			process.env['DB_MONGO_CERT'] || 'relayer.pem'
		)
		const mongoKey = fs.readFileSync(
			process.env['DB_MONGO_KEY'] || 'relayer.pem'
		)
		const mongoReplset = process.env['DB_MONGO_REPLSET'] || false

		const opts = {
			sslValidate: true,
			sslCA: mongoCa,
			sslCert: mongoCert,
			sslKey: mongoKey,
		}

		if (mongoReplset) {
			options.replSet = opts
		} else {
			options.server = opts
		}
	}

	return options
}

function connect() {
	var options = getMongoOptions({ useNewUrlParser: true })

	return MongoClient.connect(url, options).then(function(client) {
		console.log(`Great success - mongo connected to ${dbName}`)
		db = client.db(dbName)
		createIndexes(db)
	})
}

function getMongo() {
	if (db) return db
	else return null
}

function createIndexes(db) {
	db.collection('adSlots').createIndex({ ipfs: 1 })
	db.collection('adUnits').createIndex({ ipfs: 1 })
	db.collection('campaigns').createIndex({ 'status.name': 1 })
	db.collection('websites').createIndex(
		{ publisher: 1, hostname: 1 },
		{ unique: true }
	)
	db.collection('audiences').createIndex({ campaignId: 1 }, { unique: true })
}

module.exports = { connect, getMongo }
