require('dotenv').config()
const express = require('express')
const headerParser = require('header-parser')
const bodyParser = require('body-parser')
const startStatusLoop = require('./status-loop/queryValidators').startStatusLoop
const fillInitialValidators = require('./helpers/fillInitialValidators')

const signatureCheck = require('./helpers/signatureCheck')
const campaignsRoutes = require('./routes/campaigns')
const statsRoutes = require('./routes/stats')
const usersRoutes = require('./routes/users')
const validatorsRoutes = require('./routes/validators')
const adSlotsRoutes = require('./routes/adSlots')
const adUnitsRoutes = require('./routes/adUnits')
const mediaRoutes = require('./routes/media')
const authRoutes = require('./routes/auth')
const sessionRoutes = require('./routes/session')
const tagsRoutes = require('./routes/tags')

const seedDb = require('./test/prep-db/seedDb').seedDb

const app = express()
const db = require('./db')

const cfg = require('./cfg')
const port = process.env.PORT || 3012

console.log(`Initial validators:`, cfg.initialValidators)

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

db.connect()
	.then(() => {
		if (process.env.NODE_ENV === 'test') {
			console.log('Seeding DB for tests', process.env.DB_MONGO_NAME)
			return seedDb(db.getMongo())
		} else {
			// Not yet necessary for integration tests
			startStatusLoop()
			return fillInitialValidators()
		}
	})
	.then(() => {
		app.listen(port, () => console.log(`Magic happens on ${port}`))
	})
	.catch(err => {
		console.error('Error when starting app', err)
		throw new Error(err)
	})
