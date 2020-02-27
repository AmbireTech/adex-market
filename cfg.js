module.exports = {
	initialValidators:
		process.env.NODE_ENV === 'production'
			? ['https://tom.adex.network', 'https://jerry.adex.network']
			: ['https://itchy.adex.network', 'https://scratchy.adex.network'],
	discoverValidators: {
		enabled: true,
	},
	recency: 1000 * 60 * 4, // 4 min TODO: Add seperate for heartbeat, newState and approveState if needed
	statusLoopTick: 1000 * 40, // 40 secs
	sessionExpiryTime: Date.now() + 1000 * 60 * 60 * 24 * 30, // 1 month
	maxChannelsEarningFrom: 25,
	limitedIdentityEarningsLimit: '100000000000000000000', // 100 DAI/TST
	limitedIdentityEnabled: false,
	clustered: true,
}
