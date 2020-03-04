require('dotenv').config()
const express = require('express')
const headerParser = require('header-parser')
const bodyParser = require('body-parser')
const fs = require('fs')
const util = require('util')
const readFile = util.promisify(fs.readFile)

const signatureCheck = require('../helpers/signatureCheck')
const campaignsRoutes = require('../routes/campaigns')
const statsRoutes = require('../routes/stats')
const usersRoutes = require('../routes/users')
const validatorsRoutes = require('../routes/validators')
const adSlotsRoutes = require('../routes/adSlots')
const adUnitsRoutes = require('../routes/adUnits')
const mediaRoutes = require('../routes/media')
const authRoutes = require('../routes/auth')
const sessionRoutes = require('../routes/session')
const tagsRoutes = require('../routes/tags')

const createCluster = require('../helpers/cluster')

const seedDb = require('../test/prep-db/seedDb').seedDb

const app = express()
const db = require('../db')
const cfg = require('../cfg')

const port = process.env.PORT || 3012

app.use(headerParser)
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(function(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*')
	res.header(
		'Access-Control-Allow-Headers',
		'Origin, X-Requested-With, Content-Type, Accept, X-User-Signature, X-User-Address, X-Auth-Token, Cache-Control, Expires, Pragma'
	)
	res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS')
	next()
})

app.use('/campaigns', campaignsRoutes)
app.use('/stats', statsRoutes)
app.use('/users', usersRoutes)
app.use('/validators', validatorsRoutes)
app.use('/tags', tagsRoutes)
app.use('/auth', authRoutes)
app.use('/session', signatureCheck, sessionRoutes)
app.use('/slots', adSlotsRoutes)
app.use('/units', adUnitsRoutes)
app.use('/media', signatureCheck, mediaRoutes)

if (cfg.clustered) {
	createCluster(start)
} else {
	start()
}

function start() {
	db.connect()
		.then(async () => {
			if (process.env.NODE_ENV === 'test') {
				console.log('Seeding DB for tests', process.env.DB_MONGO_NAME)
				await seedDb(db.getMongo())
			}
			if (process.env.NODE_ENV === 'benchmark') {
				await readFile(
					`${__dirname}/../test/benchmark/testData.json`,
					{ encoding: 'utf8' },
					async (err, res) => {
						if (err) {
							console.error('ERROR GETTING DATA', err)
						}
						const benchmarkData = JSON.parse(res)
						await db
							.getMongo()
							.collection('campaigns')
							.insertMany(benchmarkData.campaigns)
					}
				)
			}
			app.listen(port, () => console.log(`Magic happens on ${port}`))
		})
		.catch(err => {
			console.error('Error when starting server', err)
			throw new Error(err)
		})
}
