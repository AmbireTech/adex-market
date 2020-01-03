const tape = require('tape')
const { getEstimateInUsd } = require('../status-loop/queryValidators')

const mockCampaign = {
	depositAsset: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359', // DAI contract
	depositAmount: '50' + '000000000000000000', // 50 DAI
}

tape('Expect to estimate the right amount of DAI ot USD', t => {
	getEstimateInUsd(mockCampaign).then(res => {
		t.equals(res, 50, 'Returns right amount of USD')
		t.end()
	})
})
