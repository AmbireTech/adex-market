require('dotenv').config()
const startStatusLoop = require('../status-loop/queryValidators').startStatusLoop
const fillInitialValidators = require('../helpers/fillInitialValidators')

// const seedDb = require('../test/prep-db/seedDb').seedDb

const db = require('../db')

const cfg = require('../cfg')

console.log(`Initial validators:`, cfg.initialValidators)

db.connect()
	.then(() => {
		startStatusLoop()
		return fillInitialValidators()
	})
	.catch(err => {
		console.error('Error when starting scraper', err)
		throw new Error(err)
	})
