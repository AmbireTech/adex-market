const { MongoClient } = require('mongodb')

const url = process.env.DB_MONGO_URL || 'mongodb://localhost:27017'
const dbName = process.env.DB_MONGO_NAME || 'adexMarket'

let mongoClient = null

function connect () {
	return MongoClient.connect(url, { useNewUrlParser: true })
		.then(function (client) {
			console.log(`Great success - mongo connected to ${dbName}`)
			mongoClient = client
		})
}

function getMongo () {
	if (mongoClient) return mongoClient.db(dbName)
	else return null
}

module.exports = { connect, getMongo }
