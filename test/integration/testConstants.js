const testData = require('../prep-db/seedDb').testData

module.exports = {
	ACTIVE_CAMPAIGNS: testData.campaigns.filter((c) => c.status.name === 'Active').length,
	ALL_CAMPAIGNS: testData.campaigns.length,
	DAI_ADDR: '0x7af963cF6D228E564e2A0aA0DdBF06210B38615D'
}
