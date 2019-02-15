const express = require('express')
const bodyParser = require('body-parser')
const queryValidators = require('./status-loop/queryValidators')
const campaignsRoutes = require('./routes/campaigns')
const statsRoutes = require('./routes/stats')
const usersRoutes = require('./routes/users')
const validatorsRoutes = require('./routes/validators')

const app = express()
const db = require('./db')
const port = process.env.PORT || 3012

app.use(bodyParser.json())
app.use('/campaigns', campaignsRoutes)
app.use('/stats', statsRoutes)
app.use('/users', usersRoutes)
app.use('/validators', validatorsRoutes)

db.connect()
  .then(() => {
    queryValidators()
  })
  .then(() => {
    app.listen(port, () => console.log(`Magic happens on ${port}`))
  })
