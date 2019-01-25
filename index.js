const express = require('express')
const bodyParser = require('body-parser')
const watcher = require('./ethereum-watcher')
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
  // De facto discovery loop, rename if necessary
    watcher.crawlChannelList()
    // testing to see everything is ok
    // watcher.filterChannelsByStatus('dead').then((res) => console.log(1, res))
    // watcher.filterChannelsByStatus('live').then((res) => console.log(1.5, res))
    // watcher.getChannelsSortedByUSD().then((res) => console.log(2, res))
    // watcher.getAllChannels().then((res) => console.log(3, res))
  })
  .then(() => {
    app.listen(port, () => console.log(`Magic happens on ${port}`))
  })
