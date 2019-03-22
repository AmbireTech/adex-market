module.exports = {
	initialValidators: ['http://localhost:8005', 'http://localhost:8006'],
	discoverValidators: {
		enabled: true
	},
	recency: 1000 * 60 * 2, // 2 min // TODO: Add seperate for heartbeat, newState and approveState if needed
	statusLoopTick: 1000 * 60, // 1 min
	sessionExpiryTime: Date.now() + 1000 * 60 * 60 * 24 * 30 // 1 month
}
