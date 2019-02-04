module.exports = {
  initialValidators: ['http://localhost:8005', 'http://localhost:8006'],
  discoverValidators: {
    'enabled': true
  },
  recency: 1000 * 60 * 2 // TODO: Add seperate for heartbeat, newState and approveState if needed
}
