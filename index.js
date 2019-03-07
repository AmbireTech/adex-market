require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const startStatusLoop = require('./status-loop/queryValidators')

const signatureCheck = require('./helpers/signatureCheck')
const campaignsRoutes = require('./routes/campaigns')
const statsRoutes = require('./routes/stats')
const usersRoutes = require('./routes/users')
const validatorsRoutes = require('./routes/validators')
const adSlotsRoutes = require('./routes/adSlots')
const adUnitsRoutes = require('./routes/adUnits')
const mediaRoutes = require('./routes/media')
const authRoutes = require('./routes/auth')

const app = express()
const db = require('./db')
const port = process.env.PORT || 3012

app.use(bodyParser.json())
app.use('/campaigns', campaignsRoutes)
app.use('/stats', statsRoutes)
app.use('/users', usersRoutes)
app.use('/validators', validatorsRoutes)
app.use('/auth', authRoutes)
app.use('/adslots', signatureCheck, adSlotsRoutes)
app.use('/adunits', signatureCheck, adUnitsRoutes)
app.use('/media', signatureCheck, mediaRoutes)

db.connect()
	.then(() => {
		startStatusLoop()
	})
	.then(() => {
		app.listen(port, () => console.log(`Magic happens on ${port}`))
	})
