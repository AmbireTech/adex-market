/* eslint-disable indent */
const { getCampaign } = require('../prep-db/seedDb')
const tape = require('tape')
const fetch = require('node-fetch')
const identityAddr = '0x3F07d21bEDfB20Ad9aE797cE603cB4A3C7258e65'
const marketUrl = process.env.TEST_MARKET_URL
const cfg = require('../../cfg')
const BN = require('bn.js')

const activeCampaignData = {
	status: {
		'name': 'Active',
		'lastHeartbeat': {
			'leader': new Date(Date.now()).toISOString(),
			'follower': new Date(Date.now()).toISOString(),
		},
		'lastApprovedBalances': {
			identityAddr: '1000000000000000000'
		}
	}
}

const activeCampaignDataOtherId = {
	status: {
		'name': 'Active',
		'lastHeartbeat': {
			'leader': new Date(Date.now()).toISOString(),
			'follower': new Date(Date.now()).toISOString(),
		},
		'lastApprovedBalances': {
			'0x0000000000000000000000000000000000000001': '1000000000000000000'
		}
	}
}
const campaignLimitDataNoFiltering = [
	getCampaign(activeCampaignData),
	getCampaign(activeCampaignData),
	getCampaign(activeCampaignDataOtherId),
	getCampaign({ status:
		{
			'name': 'Expired',
			'lastApprovedBalances': {
				identityAddr: '1000000000000000000'
			}
		}
	})
]
tape('GET /campaigns?limitForPublisher...  NO FILTERING', (t) => {
	fetch(`${marketUrl}/campaigns`, {
		method: 'POST',
		headers: {
			'Content-type': 'application/json'
		},
		body: JSON.stringify(campaignLimitDataNoFiltering)
	})
	.then(() => {
		fetch(`${marketUrl}/campaigns?byEarner=${identityAddr}&limitForPublisher=${identityAddr}&status=Active,Ready`)
		.then((res) => res.json())
		.then((res) => {
			t.ok(Array.isArray(res), 'returns array')
			t.equals(
				res.length,
				2, // Campaigns with publisherAddr in balances and active/ready
				'right amount of campaigns are returned'
			)
			t.ok(res.every((c) => c.status.name === 'Active' || c.status.name === 'Ready'), 'no Expired campaigns')
			t.ok(res.every((c) => c.status.lastApprovedBalances.hasOwnProperty(identityAddr)), 'Each campaign contains identityAddr in balances')
			t.end()
		})
		.catch(err => t.fail(err))
	})
	.catch(err => t.fail(err))
})

const campaignsAboveLimit = []

for (let i = 1; i <= cfg.defaultChannelLimit + 10; i++) {
	const campaignData = {
		status: {
			'name': 'Active',
			'lastHeartbeat': {
				'leader': new Date(Date.now()).toISOString(),
				'follower': new Date(Date.now()).toISOString(),
			},
			'lastApprovedBalances': {
				identityAddr: i + '000000000000000000'
			}
		}
	}
	campaignsAboveLimit.push(campaignData)
}

tape('GET /campaigns?limitForPublisher... FILTERING', (t) => {
	fetch(`${marketUrl}/campaigns`, {
		method: 'POST',
		headers: {
			'Content-type': 'application/json'
		},
		body: JSON.stringify(campaignsAboveLimit)
	})
	.then(() => {
		fetch(`${marketUrl}/campaigns?byEarner=${identityAddr}&limitForPublisher=${identityAddr}&status=Active,Ready`)
		.then((res) => res.json())
		.then((res) => {
			t.ok(Array.isArray(res), 'returns array')
			t.equals(
				res.length,
				cfg.defaultChannelLimit,
				'right amount of campaigns are returned'
			)
			t.ok(res.every((c) => c.status.name === 'Active' || c.status.name === 'Ready'), 'no Expired campaigns')
			t.ok(res.every((c) => c.status.lastApprovedBalances.hasOwnProperty(identityAddr)), 'Each campaign contains identityAddr in balances')
			let isSorted = res.every(
				(c, i) => (i === 0 ||
					new BN(c.status.lastApprovedBalances[identityAddr]).lte(
						new BN(res[i - 1].status.lastApprovedBalances[identityAddr])
					))
			)
			t.ok(isSorted, 'Array is sorted correctly')
			t.end()
		})
		.catch(err => t.fail(err))
	})
	.catch(err => t.fail(err))
})
